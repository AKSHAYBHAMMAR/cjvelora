import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { InventoryItem, ProductInventoryView, InventoryAuditLog } from '@/types';
import { getProducts } from '@/lib/products';
import { AdminProfile } from '@/lib/auth';

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

/**
 * Combines all products with their real-time inventory and calculated stock status.
 */
export async function getInventoryWithProducts(): Promise<ProductInventoryView[]> {
  try {
    const [products, inventoryRows] = await Promise.all([
      getProducts(),
      getInventory(),
    ]);

    const inventoryMap = new Map<string, InventoryItem>();
    for (const inv of inventoryRows) {
      inventoryMap.set(inv.productId, inv);
    }

    return products.map((product) => {
      const inv = inventoryMap.get(product.id) || inventoryMap.get(product.slug || '') || {
        id: `fallback-${product.id}`,
        productId: product.id,
        quantity: 0,
        reservedQuantity: 0,
        lowStockThreshold: 5,
      };

      const available = Math.max(0, inv.quantity - inv.reservedQuantity);
      let status: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock';

      if (inv.quantity <= 0 || available <= 0) {
        status = 'out_of_stock';
      } else if (inv.quantity <= inv.lowStockThreshold) {
        status = 'low_stock';
      } else {
        status = 'in_stock';
      }

      return {
        product,
        inventory: inv,
        availableQuantity: available,
        stockStatus: status,
      };
    });
  } catch (err) {
    console.error('Error fetching inventory with products:', err);
    return [];
  }
}

/**
 * Records an inventory operation into the 'audit_logs' table.
 */
export async function recordInventoryAudit(params: {
  userId?: string;
  userEmail?: string;
  action: string;
  entityId: string;
  productName?: string;
  oldQuantity?: number;
  newQuantity?: number;
  delta?: number;
  reason?: string;
}): Promise<void> {
  try {
    if (!isSupabaseConfigured) return;

    // Attempt to write into audit_logs table
    await supabase.from('audit_logs').insert({
      user_id: params.userId || null,
      action: params.action,
      entity_type: 'inventory',
      entity_id: params.entityId,
      details: {
        product_name: params.productName || '',
        user_email: params.userEmail || '',
        old_quantity: params.oldQuantity,
        new_quantity: params.newQuantity,
        delta: params.delta,
        reason: params.reason || '',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.warn('Notice: Could not write to audit_logs (continuing):', err);
  }
}

/**
 * Safely adjusts stock for a product, preventing negative inventory and recording an audit trail.
 */
export async function adjustStock(params: {
  productId: string;
  delta: number;
  reason: string;
  adminProfile: AdminProfile;
  productName?: string;
}): Promise<{ success: boolean; updatedItem?: InventoryItem; error?: string }> {
  try {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Database is not configured.' };
    }

    const { productId, delta, reason, adminProfile, productName } = params;

    // 1. Validation
    if (!productId) {
      return { success: false, error: 'Product ID is required.' };
    }
    if (typeof delta !== 'number' || isNaN(delta) || delta === 0) {
      return { success: false, error: 'Adjustment delta must be a non-zero number.' };
    }
    if (!reason || !reason.trim()) {
      return { success: false, error: 'Adjustment reason or note is required.' };
    }

    // 2. Fetch current inventory row
    const { data: current, error: fetchErr } = await supabase
      .from('inventory')
      .select('*')
      .eq('product_id', productId)
      .single();

    if (fetchErr || !current) {
      return { success: false, error: 'Could not locate inventory record for this product.' };
    }

    const currentQuantity = typeof current.quantity === 'number' ? current.quantity : 0;
    const newQuantity = currentQuantity + delta;

    // 3. Prevent negative stock
    if (newQuantity < 0) {
      return {
        success: false,
        error: `Cannot remove ${Math.abs(delta)} unit(s). Current stock is only ${currentQuantity}. Stock cannot be negative.`,
      };
    }

    // 4. Atomic conditional update preserving reserved_quantity
    const { data: updated, error: updateErr } = await supabase
      .from('inventory')
      .update({
        quantity: newQuantity,
        updated_at: new Date().toISOString(),
      })
      .eq('product_id', productId)
      .select()
      .single();

    if (updateErr || !updated) {
      return { success: false, error: updateErr?.message || 'Database update failed.' };
    }

    const updatedItem = mapSupabaseInventory(updated);

    // 5. Audit Log entry
    await recordInventoryAudit({
      userId: adminProfile.id,
      userEmail: adminProfile.email,
      action: 'INVENTORY_ADJUSTMENT',
      entityId: productId,
      productName: productName,
      oldQuantity: currentQuantity,
      newQuantity: newQuantity,
      delta: delta,
      reason: reason.trim(),
    });

    return { success: true, updatedItem };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Unexpected error during stock adjustment.' };
  }
}

/**
 * Updates the low_stock_threshold for a product without altering inventory quantity.
 */
export async function updateLowStockThreshold(params: {
  productId: string;
  threshold: number;
  adminProfile: AdminProfile;
  productName?: string;
}): Promise<{ success: boolean; updatedItem?: InventoryItem; error?: string }> {
  try {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Database is not configured.' };
    }

    const { productId, threshold, adminProfile, productName } = params;

    if (typeof threshold !== 'number' || isNaN(threshold) || threshold < 0) {
      return { success: false, error: 'Low-stock threshold must be a valid non-negative number.' };
    }

    const { data: updated, error: updateErr } = await supabase
      .from('inventory')
      .update({
        low_stock_threshold: threshold,
        updated_at: new Date().toISOString(),
      })
      .eq('product_id', productId)
      .select()
      .single();

    if (updateErr || !updated) {
      return { success: false, error: updateErr?.message || 'Failed to update threshold.' };
    }

    const updatedItem = mapSupabaseInventory(updated);

    // Record audit
    await recordInventoryAudit({
      userId: adminProfile.id,
      userEmail: adminProfile.email,
      action: 'INVENTORY_THRESHOLD_UPDATE',
      entityId: productId,
      productName: productName,
      newQuantity: threshold,
      reason: `Updated threshold to ${threshold}`,
    });

    return { success: true, updatedItem };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Unexpected error updating threshold.' };
  }
}

/**
 * Retrieves audit log entries for inventory changes.
 */
export async function getInventoryAuditLogs(productId?: string): Promise<InventoryAuditLog[]> {
  try {
    if (!isSupabaseConfigured) {
      return [];
    }

    let query = supabase
      .from('audit_logs')
      .select('*')
      .eq('entity_type', 'inventory')
      .order('created_at', { ascending: false })
      .limit(50);

    if (productId) {
      query = query.eq('entity_id', productId);
    }

    const { data, error } = await query;
    if (error || !data) {
      return [];
    }

    return data.map((row: any) => {
      const details = row.details || {};
      return {
        id: String(row.id),
        userId: row.user_id,
        userEmail: details.user_email,
        action: row.action || 'INVENTORY_ADJUSTMENT',
        entityType: row.entity_type || 'inventory',
        entityId: row.entity_id || '',
        productName: details.product_name || '',
        oldQuantity: details.old_quantity,
        newQuantity: details.new_quantity,
        delta: details.delta,
        reason: details.reason,
        createdAt: row.created_at || details.timestamp || new Date().toISOString(),
      };
    });
  } catch (err) {
    console.warn('Notice: Error fetching inventory audit logs:', err);
    return [];
  }
}
