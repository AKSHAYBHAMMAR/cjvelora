import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { CATEGORIES } from '@/data/mock-data';
import { CategoryItem, AdminCategory, CreateCategoryInput, UpdateCategoryInput } from '@/types';
import { validateImageFile, STORAGE_BUCKET, getPublicImageUrl } from '@/lib/product-images';

/**
 * Generates a clean URL slug from a category title.
 */
export function slugifyCategory(name: string): string {
  return (name || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Helper to obtain client-side JWT authorization headers for admin requests.
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined' && isSupabaseConfigured) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    } catch {
      // Ignore session retrieval errors
    }
  }
  return headers;
}

/**
 * Fetches active categories from Supabase 'categories' table for the storefront.
 * If Supabase is unconfigured, unreachable, or returns no rows,
 * gracefully falls back to the existing mock categories.
 */
export async function getCategories(): Promise<CategoryItem[]> {
  try {
    if (!isSupabaseConfigured) {
      return CATEGORIES;
    }

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      console.warn('Supabase categories fetch notice (falling back to mock data):', error.message);
      return CATEGORIES;
    }

    if (!data || data.length === 0) {
      // If table is empty, attempt querying all categories without is_active filter
      const { data: allData } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (!allData || allData.length === 0) {
        return CATEGORIES;
      }
      return allData.map(mapRowToCategoryItem);
    }

    return data.map(mapRowToCategoryItem);
  } catch (err) {
    console.warn('Unexpected error fetching categories, using fallback:', err);
    return CATEGORIES;
  }
}

function mapRowToCategoryItem(row: any): CategoryItem {
  return {
    id: String(row.id || row.slug),
    name: String(row.name || ''),
    slug: String(row.slug || ''),
    subtitle: String(row.subtitle || row.description || ''),
    image: String(row.image_url || row.image || '/images/categories/crochet-bags.jpg'),
    itemCount:
      typeof row.item_count === 'number'
        ? row.item_count
        : typeof row.itemCount === 'number'
        ? row.itemCount
        : 0,
  };
}

/**
 * Fetches all categories with real product counts for the Admin console.
 * Uses /api/admin/categories endpoint.
 */
export async function getAdminCategories(): Promise<{
  success: boolean;
  categories: AdminCategory[];
  error?: string;
}> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/admin/categories', {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    const result = await res.json();
    if (!res.ok || !result.success) {
      return {
        success: false,
        categories: [],
        error: result.error || `HTTP error ${res.status}`,
      };
    }

    return {
      success: true,
      categories: result.categories || [],
    };
  } catch (err: any) {
    console.error('Error fetching admin categories:', err);
    return {
      success: false,
      categories: [],
      error: err?.message || 'Network error fetching categories.',
    };
  }
}

/**
 * Creates a new category via POST /api/admin/categories.
 */
export async function createCategory(
  payload: CreateCategoryInput
): Promise<{ success: boolean; category?: AdminCategory; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    if (!res.ok || !result.success) {
      return {
        success: false,
        error: result.error || 'Failed to create category.',
      };
    }

    return {
      success: true,
      category: result.category,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error creating category.',
    };
  }
}

/**
 * Updates an existing category via PATCH /api/admin/categories/[categoryId].
 */
export async function updateCategory(
  categoryId: string,
  payload: UpdateCategoryInput
): Promise<{ success: boolean; category?: AdminCategory; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/admin/categories/${encodeURIComponent(categoryId)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    if (!res.ok || !result.success) {
      return {
        success: false,
        error: result.error || 'Failed to update category.',
      };
    }

    return {
      success: true,
      category: result.category,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error updating category.',
    };
  }
}

/**
 * Toggles category active status.
 */
export async function toggleCategoryActiveStatus(
  categoryId: string,
  isActive: boolean
): Promise<{ success: boolean; category?: AdminCategory; error?: string }> {
  return updateCategory(categoryId, { isActive });
}

/**
 * Deletes a category safely via DELETE /api/admin/categories/[categoryId].
 * If products exist, returns conflict error with attached product count.
 */
export async function deleteCategory(
  categoryId: string
): Promise<{
  success: boolean;
  deleted?: boolean;
  hasAttachedProducts?: boolean;
  productCount?: number;
  message?: string;
  error?: string;
}> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/admin/categories/${encodeURIComponent(categoryId)}`, {
      method: 'DELETE',
      headers,
    });

    const result = await res.json();
    if (!res.ok || !result.success) {
      return {
        success: false,
        hasAttachedProducts: result.hasAttachedProducts || false,
        productCount: result.productCount || 0,
        message: result.message,
        error: result.error || 'Failed to delete category.',
      };
    }

    return {
      success: true,
      deleted: true,
      message: result.message || 'Category successfully deleted.',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error deleting category.',
    };
  }
}

/**
 * Uploads a category image to Supabase Storage ('product-images' bucket under 'categories/').
 */
export async function uploadCategoryImage(
  file: File,
  categorySlug: string
): Promise<{ publicUrl: string | null; error: string | null }> {
  try {
    if (!isSupabaseConfigured) {
      return {
        publicUrl: null,
        error: 'Supabase storage is not configured in this environment.',
      };
    }

    const validation = validateImageFile(file);
    if (!validation.valid) {
      return { publicUrl: null, error: validation.error || 'Invalid file.' };
    }

    const cleanSlug = slugifyCategory(categorySlug) || 'general';
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const sanitizedFileName = file.name
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, '-')
      .replace(/-+/g, '-');
    const storagePath = `categories/${cleanSlug}/${timestamp}_${randomSuffix}_${sanitizedFileName}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      return { publicUrl: null, error: `Upload failed: ${uploadError.message}` };
    }

    const publicUrl = getPublicImageUrl(storagePath);
    return { publicUrl, error: null };
  } catch (err: any) {
    return {
      publicUrl: null,
      error: err?.message || 'Unexpected error uploading image.',
    };
  }
}
