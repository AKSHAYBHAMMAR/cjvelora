import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { CATEGORIES } from '@/data/mock-data';
import { CategoryItem } from '@/types';

/**
 * Fetches categories from Supabase 'categories' table.
 * If Supabase is unconfigured, unreachable, or returns no rows,
 * gracefully falls back to the existing 6 mock categories.
 */
export async function getCategories(): Promise<CategoryItem[]> {
  try {
    if (!isSupabaseConfigured) {
      return CATEGORIES;
    }

    const { data, error } = await supabase
      .from('categories')
      .select('*');

    if (error) {
      console.warn('Supabase categories fetch notice (falling back to mock data):', error.message);
      return CATEGORIES;
    }

    if (!data || data.length === 0) {
      return CATEGORIES;
    }

    // Safely map Supabase database columns (supporting both snake_case & camelCase conventions)
    return data.map((row: any) => ({
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
    }));
  } catch (err) {
    console.warn('Unexpected error fetching categories, using fallback:', err);
    return CATEGORIES;
  }
}
