import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { InventoryItem } from '@/types';

/**
 * Normalizes an inventory row from Supabase (supporting snake_case & camelCase).
 */
export function mapSupabaseInventory(row: any): InventoryItem {
  return {
    id: String(row.id || ''),
    productId: String(row.product_id || row.productId || ''),
    quantity: typeof row.quantity === 'number' ? row.quantity : 0,
    reservedQuantity:
      typeof row.reserved_quantity === 'number'
        ? row.reserved_quantity
        : typeof row.reservedQuantity === 'number'
        ? row.reservedQuantity
        : 0,
    lowStockThreshold:
      typeof row.low_stock_threshold === 'number'
        ? row.low_stock_threshold
        : typeof row.lowStockThreshold === 'number'
        ? row.lowStockThreshold
        : 5,
    updatedAt: row.updated_at || row.updatedAt || undefined,
  };
}

/**
 * Fetches inventory for all products.
 */
export async function getInventory(): Promise<InventoryItem[]> {
  try {
    if (!isSupabaseConfigured) {
      return [];
    }

    const { data, error } = await supabase
      .from('inventory')
      .select('*');

    if (error || !data) {
      return [];
    }

    return data.map(mapSupabaseInventory);
  } catch (err) {
    console.warn('Notice: Error querying inventory table:', err);
    return [];
  }
}

/**
 * Fetches inventory for a single product by product_id.
 */
export async function getInventoryByProductId(productId: string): Promise<InventoryItem | null> {
  try {
    if (!isSupabaseConfigured) {
      return null;
    }

    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('product_id', productId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return mapSupabaseInventory(data);
  } catch (err) {
    console.warn('Notice: Error querying inventory for product:', err);
    return null;
  }
}
