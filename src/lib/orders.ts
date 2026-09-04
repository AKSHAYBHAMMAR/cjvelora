import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { AdminOrder, AdminOrderItem, OrderStatus, PaymentStatus } from '@/types';

export type { OrderStatus, PaymentStatus };

/**
 * Permitted status state machine transitions.
 * Prevents nonsensical or accidental order status changes.
 */
export const VALID_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: ['refunded'],
  cancelled: [], // Terminal state
  refunded: [], // Terminal state
};

/**
 * Validates if an order status transition is allowed.
 */
export function isValidStatusTransition(current: OrderStatus, next: OrderStatus): boolean {
  if (current === next) return true;
  const allowed = VALID_STATUS_TRANSITIONS[current] || [];
  return allowed.includes(next);
}

/**
 * Normalizes an order item row from Supabase, preserving historical snapshot values.
 * Never recalculates historical totals or prices from current product records.
 */
export function mapSupabaseOrderItem(row: any): AdminOrderItem {
  const qty = Number(row.quantity ?? 1);
  const price = Number(row.unit_price ?? row.price ?? 0);
  const total = row.line_total !== undefined && row.line_total !== null
    ? Number(row.line_total)
    : qty * price;

  return {
    id: String(row.id || ''),
    orderId: String(row.order_id || row.orderId || ''),
    productId: String(row.product_id || row.productId || ''),
    productName: String(row.product_name || row.name || 'Handcrafted Creation'),
    quantity: qty,
    unitPrice: price,
    lineTotal: total,
    productImage: row.product_image || row.image_url || row.image || undefined,
    createdAt: row.created_at,
  };
}

/**
 * Normalizes an order row from Supabase into the AdminOrder interface.
 */
export function mapSupabaseOrder(row: any, items: any[] = []): AdminOrder {
  const total = Number(row.total_amount ?? row.total ?? row.amount ?? 0);
  const discount = Number(row.discount ?? row.discount_amount ?? 0);
  const shipping = Number(row.shipping_fee ?? row.shipping_amount ?? 0);
  const subtotal = row.subtotal ?? row.subtotal_amount ?? Math.max(0, total - shipping + discount);

  const mappedItems = Array.isArray(items) ? items.map(mapSupabaseOrderItem) : [];

  return {
    id: String(row.id),
    orderNumber: String(
      row.order_number ||
      row.orderNumber ||
      `VEL-${String(row.id).slice(0, 8).toUpperCase()}`
    ),
    createdAt: row.created_at || new Date().toISOString(),
    orderStatus: (String(row.status || row.order_status || 'pending').toLowerCase()) as OrderStatus,
    paymentStatus: (String(row.payment_status || row.paymentStatus || 'pending').toLowerCase()) as PaymentStatus,
    paymentMethod: String(row.payment_method || row.paymentMethod || 'Razorpay'),

    customerName: String(row.customer_name || row.shipping_name || row.email || 'Guest Client'),
    customerEmail: String(row.customer_email || row.email || ''),
    customerPhone: row.customer_phone || row.phone || undefined,

    shippingName: row.shipping_name || row.customer_name || undefined,
    shippingAddress: row.shipping_address || row.address || undefined,
    shippingCity: row.shipping_city || row.city || undefined,
    shippingState: row.shipping_state || row.state || undefined,
    shippingPostalCode: row.shipping_postal_code || row.postal_code || row.zip || undefined,
    shippingCountry: row.shipping_country || row.country || 'India',
    shippingPhone: row.shipping_phone || row.phone || undefined,

    subtotal: Number(subtotal),
    discount: Number(discount),
    shipping: Number(shipping),
    total: Number(total),

    razorpayOrderId: row.razorpay_order_id || undefined,
    razorpayPaymentId: row.razorpay_payment_id || undefined,

    items: mappedItems,
  };
}

/**
 * Fetches all orders from Supabase sorted by newest first, joining order_items.
 * Returns empty array if no orders exist yet in database (clean empty state).
 */
export async function getAdminOrders(): Promise<AdminOrder[]> {
  try {
    if (!isSupabaseConfigured) {
      return [];
    }

    // 1. Attempt joined query with order_items
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });

    if (!error && data && Array.isArray(data)) {
      return data.map((row) => mapSupabaseOrder(row, row.order_items || []));
    }

    // 2. Fallback query if relational join isn't configured in PostgREST
    const flatOrders = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (flatOrders.error || !flatOrders.data || !Array.isArray(flatOrders.data)) {
      return [];
    }

    // Query order_items
    const { data: allItems } = await supabase.from('order_items').select('*');
    const itemsByOrder = new Map<string, any[]>();

    if (allItems && Array.isArray(allItems)) {
      for (const item of allItems) {
        const orderId = String(item.order_id);
        if (!itemsByOrder.has(orderId)) itemsByOrder.set(orderId, []);
        itemsByOrder.get(orderId)!.push(item);
      }
    }

    return flatOrders.data.map((row) =>
      mapSupabaseOrder(row, itemsByOrder.get(String(row.id)) || [])
    );
  } catch (err) {
    console.warn('Notice: Error fetching orders from database:', err);
    return [];
  }
}

/**
 * Fetches a single order by ID with its snapshot items.
 */
export async function getAdminOrderById(orderId: string): Promise<AdminOrder | null> {
  try {
    if (!isSupabaseConfigured || !orderId) {
      return null;
    }

    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return mapSupabaseOrder(data, data.order_items || []);
  } catch (err) {
    console.warn('Notice: Error fetching order by id:', err);
    return null;
  }
}

/**
 * Triggers a secure server-side order status update via the API route.
 */
export async function updateOrderStatus(params: {
  orderId: string;
  newStatus: OrderStatus;
  reason?: string;
  adminProfile?: { id: string; email: string; role: string } | null;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/admin/orders/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to update order status.' };
    }

    return { success: true, message: data.message };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error updating order status.',
    };
  }
}
