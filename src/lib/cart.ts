import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { CartItem, Product } from '@/types';
import { mapSupabaseProduct } from '@/lib/products';

/**
 * Fetches the active cart for an authenticated customer from Supabase.
 */
export async function fetchCustomerCart(userId: string): Promise<CartItem[]> {
  try {
    if (!isSupabaseConfigured || !userId) {
      return [];
    }

    // 1. Locate active cart
    const { data: cartRow, error: cartError } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (cartError || !cartRow) {
      return [];
    }

    // 2. Fetch cart items with product details
    const { data: items, error: itemsError } = await supabase
      .from('cart_items')
      .select('*, products (*)')
      .eq('cart_id', cartRow.id);

    if (itemsError || !items || !Array.isArray(items)) {
      return [];
    }

    const validItems: CartItem[] = [];

    for (const row of items) {
      if (!row.products) continue;
      // Exclude unpublished products
      if (row.products.is_published === false) continue;

      const product = mapSupabaseProduct(row.products);
      const qty = Number(row.quantity ?? 1);
      if (qty > 0) {
        validItems.push({
          product,
          quantity: qty,
          selectedColor: row.selected_color || undefined,
        });
      }
    }

    return validItems;
  } catch (err) {
    console.warn('Notice: Error fetching customer cart from Supabase:', err);
    return [];
  }
}

/**
 * Synchronizes customer cart items into the Supabase carts and cart_items tables.
 */
export async function syncCustomerCart(userId: string, cartItems: CartItem[]): Promise<void> {
  try {
    if (!isSupabaseConfigured || !userId) return;

    // 1. Ensure user has an active cart row
    let { data: cartRow, error: cartError } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!cartRow) {
      const { data: newCart, error: createError } = await supabase
        .from('carts')
        .insert({ user_id: userId })
        .select('id')
        .single();

      if (createError || !newCart) return;
      cartRow = newCart;
    }

    // 2. Clear old items and write new items
    await supabase.from('cart_items').delete().eq('cart_id', cartRow.id);

    if (cartItems.length > 0) {
      const rows = cartItems.map((item) => ({
        cart_id: cartRow.id,
        product_id: item.product.id,
        quantity: Math.max(1, item.quantity),
        selected_color: item.selectedColor || null,
      }));

      await supabase.from('cart_items').insert(rows);
    }
  } catch (err) {
    console.warn('Notice: Could not sync cart to Supabase:', err);
  }
}

/**
 * Clears the active customer cart in Supabase.
 */
export async function clearCustomerCart(userId: string): Promise<void> {
  try {
    if (!isSupabaseConfigured || !userId) return;

    const { data: cartRow } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (cartRow) {
      await supabase.from('cart_items').delete().eq('cart_id', cartRow.id);
    }
  } catch (err) {
    console.warn('Notice: Could not clear customer cart in Supabase:', err);
  }
}
