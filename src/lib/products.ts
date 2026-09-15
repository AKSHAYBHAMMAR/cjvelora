import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { PRODUCTS } from '@/data/mock-data';
import { Product } from '@/types';
import { getPublicImageUrl } from '@/lib/product-images';

export interface AdminProduct extends Product {
  inventoryQuantity: number;
  reservedQuantity: number;
  availableStock: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  createdAt: string;
}

export interface CreateProductInput {
  name: string;
  slug: string;
  description: string;
  longDescription?: string;
  price: number;
  compareAtPrice?: number;
  categoryId?: string;
  category?: string;
  categorySlug?: string;
  isPublished?: boolean;
  isBestSeller?: boolean;
  isMadeToOrder?: boolean;
  leadTime?: string;
  stockQuantity?: number;
  lowStockThreshold?: number;
  imageUrl?: string;
  materials?: string;
  dimensions?: string;
  careInstructions?: string;
}

/**
 * Helper to obtain client-side JWT authorization headers
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
      // Ignore session retrieval issues in restricted contexts
    }
  }
  return headers;
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
 * If publishedOnly is true (or default for customer shopping), excludes unpublished/draft products.
 */
export async function getProducts(options?: { publishedOnly?: boolean }): Promise<Product[]> {
  try {
    if (!isSupabaseConfigured) {
      return PRODUCTS;
    }

    let query = supabase
      .from('products')
      .select('*, categories ( id, name, slug ), product_images ( id, product_id, storage_path, alt_text, display_order )')
      .order('created_at', { ascending: false });

    if (options?.publishedOnly) {
      query = query.eq('is_published', true);
    }

    const { data, error } = await query;

    if (error) {
      // If joined query fails due to relationship naming, fallback to flat query
      let flatQuery = supabase.from('products').select('*').order('created_at', { ascending: false });
      if (options?.publishedOnly) {
        flatQuery = flatQuery.eq('is_published', true);
      }
      const flatRes = await flatQuery;
      if (!flatRes.error && flatRes.data && flatRes.data.length > 0) {
        return flatRes.data.map((row: any) => mapSupabaseProduct(row));
      }
      console.warn('Supabase products fetch notice (falling back to mock data):', error.message);
      return PRODUCTS;
    }

    if (!data || data.length === 0) {
      return PRODUCTS;
    }

    let results = data.map((row: any) => mapSupabaseProduct(row));
    if (options?.publishedOnly) {
      results = results.filter((p) => p.isPublished !== false);
    }
    return results;
  } catch (err) {
    console.warn('Unexpected error fetching products, using fallback:', err);
    return PRODUCTS;
  }
}

/**
 * Fetches curated 'Most Loved' (best-seller) products from Supabase.
 */
export async function getMostLovedProducts(options?: { publishedOnly?: boolean }): Promise<Product[]> {
  try {
    if (!isSupabaseConfigured) {
      return PRODUCTS.filter((p) => p.isMostLoved);
    }

    let query = supabase
      .from('products')
      .select('*, categories ( id, name, slug ), product_images ( id, product_id, storage_path, alt_text, display_order )')
      .or('is_best_seller.eq.true,is_most_loved.eq.true');

    if (options?.publishedOnly) {
      query = query.eq('is_published', true);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      const all = await getProducts(options);
      const filtered = all.filter((p) => p.isMostLoved);
      return filtered.length > 0 ? filtered : PRODUCTS.filter((p) => p.isMostLoved);
    }

    let results = data.map((row: any) => mapSupabaseProduct(row));
    if (options?.publishedOnly) {
      results = results.filter((p) => p.isPublished !== false);
    }
    return results;
  } catch (err) {
    console.warn('Unexpected error fetching most loved products, using fallback:', err);
    return PRODUCTS.filter((p) => p.isMostLoved);
  }
}

/**
 * Fetches products merged with real inventory stock data for the Admin Management Console.
 * In browser context, queries the secure /api/admin/products endpoint.
 */
export async function getAdminProducts(): Promise<AdminProduct[]> {
  try {
    if (typeof window !== 'undefined') {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/products', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.products)) {
          return data.products;
        }
      }
    }

    // Direct database fallback
    if (!isSupabaseConfigured) {
      return PRODUCTS.map((p) => ({
        ...p,
        inventoryQuantity: 0,
        reservedQuantity: 0,
        availableStock: 0,
        lowStockThreshold: 5,
        isLowStock: true,
        createdAt: new Date().toISOString(),
      }));
    }

    const [productsRes, inventoryRes] = await Promise.all([
      supabase
        .from('products')
        .select('*, categories(id, name, slug)')
        .order('created_at', { ascending: false }),
      supabase.from('inventory').select('*'),
    ]);

    const inventoryMap = new Map<string, any>();
    if (inventoryRes.data) {
      for (const inv of inventoryRes.data) {
        inventoryMap.set(inv.product_id, inv);
      }
    }

    return (productsRes.data || []).map((row: any) => {
      const prod = mapSupabaseProduct(row);
      const inv = inventoryMap.get(prod.id) || {
        quantity: 0,
        reserved_quantity: 0,
        low_stock_threshold: 5,
      };

      const quantity = typeof inv.quantity === 'number' ? inv.quantity : 0;
      const reserved = typeof inv.reserved_quantity === 'number' ? inv.reserved_quantity : 0;
      const threshold = typeof inv.low_stock_threshold === 'number' ? inv.low_stock_threshold : 5;
      const available = Math.max(0, quantity - reserved);

      return {
        ...prod,
        inventoryQuantity: quantity,
        reservedQuantity: reserved,
        availableStock: available,
        lowStockThreshold: threshold,
        isLowStock: available <= threshold,
        createdAt: row.created_at || new Date().toISOString(),
      };
    });
  } catch (err) {
    console.warn('Error in getAdminProducts:', err);
    return [];
  }
}

/**
 * Creates a new product and initializes inventory via /api/admin/products.
 */
export async function createProduct(
  input: CreateProductInput
): Promise<{ data: any | null; error: string | null }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers,
      body: JSON.stringify(input),
    });

    const result = await res.json();
    if (!res.ok || !result.success) {
      return { data: null, error: result.error || 'Failed to create product.' };
    }

    return { data: result.product, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Network error during product creation.' };
  }
}

/**
 * Updates an existing product via /api/admin/products/[productId].
 */
export async function updateProduct(
  id: string,
  input: Partial<CreateProductInput>
): Promise<{ data: any | null; error: string | null }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/admin/products/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(input),
    });

    const result = await res.json();
    if (!res.ok || !result.success) {
      return { data: null, error: result.error || 'Failed to update product.' };
    }

    return { data: result.product, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Network error during product update.' };
  }
}

/**
 * Quick-action to update a product price in 2 clicks.
 */
export async function quickUpdatePrice(
  productId: string,
  newPrice: number
): Promise<{ success: boolean; error: string | null }> {
  try {
    const res = await updateProduct(productId, { price: newPrice });
    if (res.error) {
      return { success: false, error: res.error };
    }
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update price.' };
  }
}

/**
 * Quick-action to update a product stock quantity and threshold.
 */
export async function quickUpdateStock(
  productId: string,
  stockQuantity: number,
  lowStockThreshold?: number
): Promise<{ success: boolean; error: string | null }> {
  try {
    const res = await updateProduct(productId, {
      stockQuantity,
      lowStockThreshold,
    });
    if (res.error) {
      return { success: false, error: res.error };
    }
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update stock.' };
  }
}

/**
 * Toggles or sets the published status of a product.
 */
export async function toggleProductPublishStatus(
  id: string,
  currentStatus: boolean
): Promise<{ success: boolean; isPublished?: boolean; error: string | null }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/admin/products/${encodeURIComponent(id)}/publish`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ isPublished: !currentStatus }),
    });

    const result = await res.json();
    if (!res.ok || !result.success) {
      return { success: false, error: result.error || 'Failed to toggle status.' };
    }

    return { success: true, isPublished: result.isPublished, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error toggling publish status.' };
  }
}

/**
 * Safely removes a product.
 * If archive is true, safely unpublishes/archives the product to preserve historical orders.
 */
export async function deleteProduct(
  id: string,
  options?: { archive?: boolean }
): Promise<{ success: boolean; archived?: boolean; deleted?: boolean; hasOrderReferences?: boolean; error: string | null; message?: string }> {
  try {
    const headers = await getAuthHeaders();
    const query = options?.archive ? '?archive=true' : '';
    const res = await fetch(`/api/admin/products/${encodeURIComponent(id)}${query}`, {
      method: 'DELETE',
      headers,
    });

    const result = await res.json();
    if (!res.ok || !result.success) {
      return {
        success: false,
        hasOrderReferences: Boolean(result.hasOrderReferences),
        error: result.error || 'Failed to remove product.',
      };
    }

    return {
      success: true,
      archived: Boolean(result.archived),
      deleted: Boolean(result.deleted),
      hasOrderReferences: Boolean(result.hasOrderReferences),
      message: result.message,
      error: null,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error removing product.' };
  }
}
