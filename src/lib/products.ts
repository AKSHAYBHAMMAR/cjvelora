import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { PRODUCTS } from '@/data/mock-data';
import { Product } from '@/types';

/**
 * Maps a database product row to the frontend Product type.
 * Supports snake_case, camelCase, and relational category joins.
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

  const primaryImage =
    row.image_url ||
    row.image ||
    (Array.isArray(row.images) && row.images[0]) ||
    '/images/products/tote-bag.jpg';

  const images =
    Array.isArray(row.images) && row.images.length > 0
      ? row.images
      : [primaryImage];

  return {
    id: String(row.id || row.slug),
    name: String(row.name || ''),
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
      .select('*, categories ( id, name, slug )');

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
      // Try fallback to fetching all and filtering in memory
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
