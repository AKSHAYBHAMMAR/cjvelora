import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { ProductImageRecord } from '@/types';

export const STORAGE_BUCKET = 'product-images';

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates file format and size for product image uploads.
 */
export function validateImageFile(file: File): ImageValidationResult {
  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }

  // Type check
  const isTypeValid = ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase());
  const hasValidExt = ALLOWED_EXTENSIONS.some((ext) =>
    file.name.toLowerCase().endsWith(ext)
  );

  if (!isTypeValid && !hasValidExt) {
    return {
      valid: false,
      error: `Unsupported format for "${file.name}". Only JPEG, PNG, and WebP images are allowed.`,
    };
  }

  // Size check
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File "${file.name}" is ${sizeInMB}MB. Maximum permitted size is 5MB.`,
    };
  }

  return { valid: true };
}

/**
 * Generates an organized, collision-safe storage path for an uploaded image.
 * Format: products/{productId}/{timestamp}_{sanitizedFileName}
 */
export function generateStoragePath(productId: string, originalFileName: string): string {
  const sanitizedName = originalFileName
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, '-')
    .replace(/-+/g, '-');
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  return `products/${productId}/${timestamp}_${randomSuffix}_${sanitizedName}`;
}

/**
 * Resolves a storage path to a publicly accessible Supabase Storage URL.
 */
export function getPublicImageUrl(storagePath: string): string {
  if (!storagePath) return '';
  // If it's already a full URL or local path, return as-is
  if (storagePath.startsWith('http://') || storagePath.startsWith('https://') || storagePath.startsWith('/')) {
    return storagePath;
  }
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
  return data?.publicUrl || '';
}

/**
 * Fetches all product_images rows for a given product ID from Supabase.
 */
export async function getProductImages(productId: string): Promise<ProductImageRecord[]> {
  try {
    if (!isSupabaseConfigured || !productId) {
      return [];
    }

    const { data, error } = await supabase
      .from('product_images')
      .select('*')
      .eq('product_id', productId)
      .order('display_order', { ascending: true });

    if (error) {
      console.warn(`Notice: Could not fetch product_images for ${productId}:`, error.message);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((row: any) => ({
      id: String(row.id),
      productId: String(row.product_id),
      storagePath: String(row.storage_path),
      publicUrl: getPublicImageUrl(row.storage_path),
      altText: String(row.alt_text || ''),
      displayOrder: Number(row.display_order ?? 0),
      createdAt: row.created_at,
    }));
  } catch (err) {
    console.warn('Unexpected error in getProductImages:', err);
    return [];
  }
}

/**
 * Uploads a validated image file to Supabase Storage ('product-images' bucket)
 * and creates a corresponding record in the 'product_images' table.
 */
export async function uploadProductImage(
  productId: string,
  file: File,
  altText?: string,
  displayOrder?: number
): Promise<{ data: ProductImageRecord | null; error: string | null }> {
  try {
    if (!isSupabaseConfigured) {
      return {
        data: null,
        error: 'Supabase is not configured in the environment. Image upload requires an active Supabase connection.',
      };
    }

    // 1. Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return { data: null, error: validation.error || 'Invalid image file.' };
    }

    // 2. Build unique path
    const storagePath = generateStoragePath(productId, file.name);

    // 3. Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      return { data: null, error: `Storage upload failed: ${uploadError.message}` };
    }

    // 4. Create row in product_images table
    const { data: dbData, error: dbError } = await supabase
      .from('product_images')
      .insert({
        product_id: productId,
        storage_path: storagePath,
        alt_text: altText || file.name.replace(/\.[^/.]+$/, ''),
        display_order: displayOrder ?? 0,
      })
      .select()
      .single();

    if (dbError) {
      // Clean up orphaned storage object if database insert failed
      await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
      return { data: null, error: `Failed to save image record: ${dbError.message}` };
    }

    const newRecord: ProductImageRecord = {
      id: String(dbData.id),
      productId: String(dbData.product_id),
      storagePath: String(dbData.storage_path),
      publicUrl: getPublicImageUrl(dbData.storage_path),
      altText: String(dbData.alt_text || ''),
      displayOrder: Number(dbData.display_order ?? 0),
      createdAt: dbData.created_at,
    };

    return { data: newRecord, error: null };
  } catch (err: any) {
    return {
      data: null,
      error: err?.message || 'Unexpected error occurred during image upload.',
    };
  }
}

/**
 * Safely removes a Supabase-hosted image from both Supabase Storage and the 'product_images' table.
 * Strictly guards against modifying or deleting any local image paths.
 */
export async function deleteProductImage(
  imageRecord: { id: string; storagePath: string }
): Promise<{ success: boolean; error: string | null }> {
  try {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Database is not configured.' };
    }

    // Critical safety check: Never attempt to delete local assets
    if (
      imageRecord.storagePath.startsWith('/') ||
      imageRecord.storagePath.includes('images/products') ||
      imageRecord.storagePath.includes('images/categories')
    ) {
      return { success: false, error: 'Safety protection: Cannot delete local project assets.' };
    }

    // 1. Remove from Supabase Storage
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([imageRecord.storagePath]);

    if (storageError) {
      console.warn('Storage removal warning:', storageError.message);
      // Continue to remove DB record even if storage file was already removed
    }

    // 2. Remove row from product_images table
    const { error: dbError } = await supabase
      .from('product_images')
      .delete()
      .eq('id', imageRecord.id);

    if (dbError) {
      return { success: false, error: `Failed to delete image record: ${dbError.message}` };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Unexpected error occurred while deleting image.',
    };
  }
}

/**
 * Updates display_order values for a reordered list of product images.
 */
export async function updateImageOrder(
  reorderedImages: { id: string; displayOrder: number }[]
): Promise<{ success: boolean; error: string | null }> {
  try {
    if (!isSupabaseConfigured || reorderedImages.length === 0) {
      return { success: true, error: null };
    }

    // Execute updates
    for (const img of reorderedImages) {
      const { error } = await supabase
        .from('product_images')
        .update({ display_order: img.displayOrder })
        .eq('id', img.id);

      if (error) {
        return { success: false, error: error.message };
      }
    }

    return { success: true, error: null };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to update image order.',
    };
  }
}
