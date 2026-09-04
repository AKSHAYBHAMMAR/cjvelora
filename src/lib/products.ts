import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { PRODUCTS } from '@/data/mock-data';
import { Product } from '@/types';
import { getInventory } from '@/lib/inventory';
import { getPublicImageUrl } from '@/lib/product-images';

export interface AdminProduct extends Product {
  inventoryQuantity: number;
  lowStockThreshold: number;
  isLowStock: boolean;
}

export interface CreateProductInput {
  name: string;
  slug: string;
  description: string;
  longDescription?: string;
  price: number;
  compareAtPrice?: number;
  categoryId?: string;
  category: string;
  categorySlug?: string;
  isPublished: boolean;
  isBestSeller: boolean;
  imageUrl?: string;
  materials?: string;
  dimensions?: string;
  careInstructions?: string;
}

/**
 * Maps a database product row to the frontend Product type.
 * Supports snake_case, camelCase, relational category joins, and Supabase product_images.
 */
export function mapSupabaseProduct(
  row: any,
  categoriesMap?: Map<string, { name: string; slug: string }>
): Product {
  const categoryName =
    row.categories?.name ||
    row.category_name ||
    row.category ||
    (row.category_id && categoriesMap?.get(row.category_id)?.name) ||
    'Crochet Bags';

  const categorySlug =
    row.categories?.slug ||
    row.category_slug ||
    (row.category_id && categoriesMap?.get(row.category_id)?.slug) ||
    'crochet-bags';

  // Process Supabase uploaded product_images if present
  const uploadedImages = Array.isArray(row.product_images) && row.product_images.length > 0
    ? row.product_images
        .map((pi: any) => ({
          id: String(pi.id),
          productId: String(pi.product_id),
          storagePath: String(pi.storage_path),
          publicUrl: getPublicImageUrl(pi.storage_path),
          altText: String(pi.alt_text || ''),
          displayOrder: Number(pi.display_order ?? 0),
          createdAt: pi.created_at,
        }))
        .sort((a: any, b: any) => a.displayOrder - b.displayOrder)
    : undefined;

  // Primary image: if uploaded images exist in Supabase, use the first one;
  // otherwise preserve the existing local image (e.g. /images/products/tote-bag.jpg)
  const primaryImage =
    (uploadedImages && uploadedImages.length > 0 && uploadedImages[0].publicUrl) ||
    row.image_url ||
    row.image ||
    (Array.isArray(row.images) && row.images[0]) ||
    '/images/products/tote-bag.jpg';

  const images =
    uploadedImages && uploadedImages.length > 0
      ? uploadedImages.map((img: any) => img.publicUrl)
      : Array.isArray(row.images) && row.images.length > 0
      ? row.images
      : [primaryImage];

  return {
    id: String(row.id || row.slug),
    name: String(row.name || ''),
    slug: String(row.slug || row.id || ''),
    category: categoryName,
    categorySlug: categorySlug,
    price: Number(row.price || 0),
    originalPrice: row.compare_at_price
      ? Number(row.compare_at_price)
      : row.original_price
      ? Number(row.original_price)
      : row.originalPrice
      ? Number(row.originalPrice)
      : undefined,
    description: String(row.description || ''),
    longDescription: row.long_description || row.longDescription || undefined,
    materials: String(row.materials || '100% Organic Cotton Yarn'),
    dimensions: row.dimensions || undefined,
    careInstructions: row.care_instructions || row.careInstructions || undefined,
    image: primaryImage,
    images: images,
    badge: row.badge || undefined,
    isMostLoved: Boolean(row.is_best_seller ?? row.is_most_loved ?? row.isMostLoved),
    isMadeToOrder: Boolean(row.is_made_to_order ?? row.isMadeToOrder),
    isPublished:
      row.is_published !== undefined
        ? Boolean(row.is_published)
        : row.isPublished !== undefined
        ? Boolean(row.isPublished)
        : true,
    leadTime: row.lead_time || row.leadTime || undefined,
    rating: typeof row.rating === 'number' ? row.rating : 4.9,
    reviewCount:
      typeof row.review_count === 'number'
        ? row.review_count
        : typeof row.reviewCount === 'number'
        ? row.reviewCount
        : 25,
    inStock:
      row.in_stock !== undefined
        ? Boolean(row.in_stock)
        : row.inStock !== undefined
        ? Boolean(row.inStock)
        : true,
    colors: Array.isArray(row.colors) ? row.colors : undefined,
    categoryId: row.category_id ? String(row.category_id) : undefined,
  };
}

/**
 * Fetches all products from Supabase 'products' table.
 * If unconfigured or query fails, gracefully falls back to mock products.
 */
export async function getProducts(): Promise<Product[]> {
  try {
    if (!isSupabaseConfigured) {
      return PRODUCTS;
    }

    // Attempt joined query first
    let { data, error } = await supabase
      .from('products')
      .select('*, categories ( id, name, slug )')
      .order('id', { ascending: true });

    // If join fails due to PostgREST relationship naming, fall back to flat query
    if (error || !data) {
      const flatQuery = await supabase.from('products').select('*');
      data = flatQuery.data;
      error = flatQuery.error;
    }

    if (error) {
      console.warn('Supabase products fetch notice (falling back to mock data):', error.message);
      return PRODUCTS;
    }

    if (!data || data.length === 0) {
      return PRODUCTS;
    }

    return data.map((row: any) => mapSupabaseProduct(row));
  } catch (err) {
    console.warn('Unexpected error fetching products, using fallback:', err);
    return PRODUCTS;
  }
}

/**
 * Fetches curated 'Most Loved' (best-seller) products from Supabase.
 */
export async function getMostLovedProducts(): Promise<Product[]> {
  try {
    if (!isSupabaseConfigured) {
      return PRODUCTS.filter((p) => p.isMostLoved);
    }

    let { data, error } = await supabase
      .from('products')
      .select('*, categories ( id, name, slug )')
      .or('is_best_seller.eq.true,is_most_loved.eq.true');

    if (error || !data || data.length === 0) {
      // Fallback to in-memory filter
      const all = await getProducts();
      const filtered = all.filter((p) => p.isMostLoved);
      return filtered.length > 0 ? filtered : PRODUCTS.filter((p) => p.isMostLoved);
    }

    return data.map((row: any) => mapSupabaseProduct(row));
  } catch (err) {
    console.warn('Unexpected error fetching most loved products, using fallback:', err);
    return PRODUCTS.filter((p) => p.isMostLoved);
  }
}

/**
 * Fetches products merged with real inventory stock data for the Admin Management Console.
 */
export async function getAdminProducts(): Promise<AdminProduct[]> {
  try {
    const [products, inventoryRows] = await Promise.all([
      getProducts(),
      getInventory(),
    ]);

    const inventoryMap = new Map<string, { quantity: number; threshold: number }>();
    for (const inv of inventoryRows) {
      inventoryMap.set(inv.productId, {
        quantity: inv.quantity,
        threshold: inv.lowStockThreshold,
      });
    }

    return products.map((prod) => {
      const inv = inventoryMap.get(prod.id) || inventoryMap.get(prod.slug || '') || {
        quantity: 0,
        threshold: 5,
      };

      return {
        ...prod,
        inventoryQuantity: inv.quantity,
        lowStockThreshold: inv.threshold,
        isLowStock: inv.quantity <= inv.threshold,
      };
    });
  } catch (err) {
    console.warn('Error fetching admin products with inventory:', err);
    const fallbackProducts = await getProducts();
    return fallbackProducts.map((p) => ({
      ...p,
      inventoryQuantity: 0,
      lowStockThreshold: 5,
      isLowStock: true,
    }));
  }
}

/**
 * Creates a new product in the Supabase products table and creates its inventory record.
 */
export async function createProduct(
  input: CreateProductInput
): Promise<{ data: Product | null; error: string | null }> {
  try {
    if (!isSupabaseConfigured) {
      return { data: null, error: 'Database is not configured in environment.' };
    }

    // 1. Check slug uniqueness
    const { data: existingSlug } = await supabase
      .from('products')
      .select('id')
      .eq('slug', input.slug.trim())
      .maybeSingle();

    if (existingSlug) {
      return { data: null, error: `A product with slug "${input.slug}" already exists. Please choose a unique slug.` };
    }

    // 2. Build insertion payload
    const payload: any = {
      name: input.name.trim(),
      slug: input.slug.trim(),
      description: input.description.trim(),
      long_description: input.longDescription?.trim() || null,
      price: Number(input.price),
      compare_at_price: input.compareAtPrice ? Number(input.compareAtPrice) : null,
      image_url: input.imageUrl?.trim() || '/images/products/tote-bag.jpg',
      is_best_seller: Boolean(input.isBestSeller),
      is_published: Boolean(input.isPublished),
      materials: input.materials?.trim() || '100% Organic Cotton Yarn',
      dimensions: input.dimensions?.trim() || null,
      care_instructions: input.careInstructions?.trim() || null,
      in_stock: true,
    };

    if (input.categoryId) {
      payload.category_id = input.categoryId;
    }

    const { data, error } = await supabase
      .from('products')
      .insert(payload)
      .select('*, categories(id, name, slug)')
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    // 3. Initialize an inventory record for this product
    if (data?.id) {
      await supabase.from('inventory').insert({
        product_id: data.id,
        quantity: 0,
        reserved_quantity: 0,
        low_stock_threshold: 5,
      }).select();
    }

    return { data: mapSupabaseProduct(data), error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to create product.' };
  }
}

/**
 * Updates an existing product in Supabase.
 */
export async function updateProduct(
  id: string,
  input: Partial<CreateProductInput>
): Promise<{ data: Product | null; error: string | null }> {
  try {
    if (!isSupabaseConfigured) {
      return { data: null, error: 'Database is not configured in environment.' };
    }

    // If slug is changed, ensure the new slug is unique
    if (input.slug) {
      const { data: existingSlug } = await supabase
        .from('products')
        .select('id')
        .eq('slug', input.slug.trim())
        .neq('id', id)
        .maybeSingle();

      if (existingSlug) {
        return { data: null, error: `Another product with slug "${input.slug}" already exists.` };
      }
    }

    const payload: any = {};
    if (input.name !== undefined) payload.name = input.name.trim();
    if (input.slug !== undefined) payload.slug = input.slug.trim();
    if (input.description !== undefined) payload.description = input.description.trim();
    if (input.longDescription !== undefined) payload.long_description = input.longDescription.trim();
    if (input.price !== undefined) payload.price = Number(input.price);
    if (input.compareAtPrice !== undefined) payload.compare_at_price = input.compareAtPrice ? Number(input.compareAtPrice) : null;
    if (input.categoryId !== undefined) payload.category_id = input.categoryId;
    if (input.isPublished !== undefined) payload.is_published = Boolean(input.isPublished);
    if (input.isBestSeller !== undefined) payload.is_best_seller = Boolean(input.isBestSeller);
    if (input.imageUrl !== undefined) payload.image_url = input.imageUrl.trim();
    if (input.materials !== undefined) payload.materials = input.materials.trim();
    if (input.dimensions !== undefined) payload.dimensions = input.dimensions.trim();
    if (input.careInstructions !== undefined) payload.care_instructions = input.careInstructions.trim();

    const { data, error } = await supabase
      .from('products')
      .update(payload)
      .eq('id', id)
      .select('*, categories(id, name, slug)')
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: mapSupabaseProduct(data), error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to update product.' };
  }
}

/**
 * Toggles the published status of a product.
 */
export async function toggleProductPublishStatus(
  id: string,
  currentStatus: boolean
): Promise<{ success: boolean; error: string | null }> {
  try {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Database is not configured.' };
    }

    const { error } = await supabase
      .from('products')
      .update({ is_published: !currentStatus })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to toggle status.' };
  }
}

/**
 * Safely attempts to delete a product.
 * If foreign key constraints prevent deletion (e.g. inventory or order records),
 * cleanly reports the constraint error so the admin can choose to unpublish instead.
 */
export async function deleteProduct(
  id: string
): Promise<{ success: boolean; hasForeignKeyConflict: boolean; error: string | null }> {
  try {
    if (!isSupabaseConfigured) {
      return { success: false, hasForeignKeyConflict: false, error: 'Database is not configured.' };
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      // Check for foreign key constraint violation (e.g. code 23503)
      const isFkError =
        error.code === '23503' ||
        error.message?.toLowerCase().includes('foreign key') ||
        error.message?.toLowerCase().includes('violates');

      return {
        success: false,
        hasForeignKeyConflict: isFkError,
        error: isFkError
          ? 'Cannot delete this product because existing inventory or order records reference it. To prevent data corruption, unpublish the product instead.'
          : error.message,
      };
    }

    return { success: true, hasForeignKeyConflict: false, error: null };
  } catch (err: any) {
    return {
      success: false,
      hasForeignKeyConflict: false,
      error: err?.message || 'Failed to delete product.',
    };
  }
}
