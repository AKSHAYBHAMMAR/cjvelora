import { NextRequest, NextResponse } from 'next/server';
import { supabase as defaultSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { verifyAdminRole } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json(
        { success: false, error: 'Database is not configured in the environment.' },
        { status: 503 }
      );
    }

    // 1. Verify user session & admin role strictly via Authorization header
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Administrator authentication required.' },
        { status: 401 }
      );
    }

    const { data: tokenUserData, error: authError } = await defaultSupabase.auth.getUser(token);
    const user = tokenUserData?.user;

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session invalid or expired.' },
        { status: 401 }
      );
    }

    const role = await verifyAdminRole(user.id, user.email);
    if (!role) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have administrator permissions.' },
        { status: 403 }
      );
    }

    // 2. Fetch authoritative database data in parallel
    const [ordersRes, inventoryRes, productsRes, cartsRes] = await Promise.all([
      defaultSupabase
        .from('orders')
        .select('id, order_number, customer_id, customer_name, customer_email, total_amount, subtotal, payment_status, order_status, status, created_at')
        .order('created_at', { ascending: false }),
      defaultSupabase
        .from('inventory')
        .select('id, product_id, quantity, reserved_quantity, low_stock_threshold, updated_at'),
      defaultSupabase
        .from('products')
        .select('id, name, slug, price, image, image_url, in_stock, is_published'),
      defaultSupabase
        .from('carts')
        .select('user_id'),
    ]);

    if (ordersRes.error) {
      console.error('Error fetching admin orders:', ordersRes.error);
    }
    if (inventoryRes.error) {
      console.error('Error fetching admin inventory:', inventoryRes.error);
    }

    const orders = ordersRes.data || [];
    const inventoryRows = inventoryRes.data || [];
    const products = productsRes.data || [];
    const carts = cartsRes.data || [];

    // 3. Compute Revenue & Orders KPIs
    let totalRevenue = 0;
    let paidOrdersCount = 0;
    let pendingOrdersCount = 0;
    let cancelledOrdersCount = 0;

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    let revenue7d = 0;
    let orders7d = 0;
    let revenue30d = 0;
    let orders30d = 0;

    for (const order of orders) {
      const pStatus = String(order.payment_status || 'pending').toLowerCase();
      const oStatus = String(order.order_status || order.status || 'pending').toLowerCase();
      const orderTotal = Number(order.total_amount ?? order.subtotal ?? 0);
      const createdAt = new Date(order.created_at).getTime();

      if (pStatus === 'paid') {
        totalRevenue += orderTotal;
        paidOrdersCount++;

        if (createdAt >= sevenDaysAgo) {
          revenue7d += orderTotal;
        }
        if (createdAt >= thirtyDaysAgo) {
          revenue30d += orderTotal;
        }
      } else if (pStatus === 'pending') {
        pendingOrdersCount++;
      }

      if (oStatus === 'cancelled') {
        cancelledOrdersCount++;
      }

      if (createdAt >= sevenDaysAgo) {
        orders7d++;
      }
      if (createdAt >= thirtyDaysAgo) {
        orders30d++;
      }
    }

    const totalOrders = orders.length;
    const avgOrderValue = paidOrdersCount > 0 ? Math.round(totalRevenue / paidOrdersCount) : 0;

    // 4. Compute Customer Count
    // Distinct customer accounts from orders & carts, filtering nulls
    const customerIds = new Set<string>();
    for (const order of orders) {
      if (order.customer_id) customerIds.add(String(order.customer_id));
    }
    for (const cart of carts) {
      if (cart.user_id) customerIds.add(String(cart.user_id));
    }
    const totalCustomers = customerIds.size;

    // 5. Compute Available Inventory & Low Stock Items
    const productsMap = new Map<string, any>();
    for (const p of products) {
      productsMap.set(String(p.id), p);
      if (p.slug) productsMap.set(String(p.slug), p);
    }

    let availableInventory = 0;
    const lowStockItems: Array<{
      productId: string;
      productName: string;
      productSlug?: string;
      productImage?: string;
      availableQuantity: number;
      quantity: number;
      reservedQuantity: number;
      lowStockThreshold: number;
      price?: number;
    }> = [];

    for (const inv of inventoryRows) {
      const qty = Number(inv.quantity ?? 0);
      const reserved = Number(inv.reserved_quantity ?? 0);
      const threshold = typeof inv.low_stock_threshold === 'number' ? inv.low_stock_threshold : 5;
      const available = Math.max(0, qty - reserved);

      availableInventory += available;

      if (available <= threshold) {
        const prod = productsMap.get(String(inv.product_id));
        lowStockItems.push({
          productId: String(inv.product_id),
          productName: prod?.name || `Artisan Piece #${String(inv.product_id).slice(0, 6)}`,
          productSlug: prod?.slug,
          productImage: prod?.image_url || prod?.image || '/images/products/ring-1.jpg',
          availableQuantity: available,
          quantity: qty,
          reservedQuantity: reserved,
          lowStockThreshold: threshold,
          price: prod?.price ? Number(prod.price) : undefined,
        });
      }
    }

    // Sort low stock by available units ascending (most critical first)
    lowStockItems.sort((a, b) => a.availableQuantity - b.availableQuantity);

    // 6. Recent Orders
    const recentOrders = orders.slice(0, 8).map((order) => {
      const displayStatus = String(order.order_status || order.status || 'pending').toLowerCase();
      const paymentStatus = String(order.payment_status || 'pending').toLowerCase();
      return {
        id: String(order.id),
        orderNumber: String(order.order_number || `VEL-${String(order.id).slice(0, 8).toUpperCase()}`),
        customerName: String(order.customer_name || 'Client'),
        customerEmail: String(order.customer_email || ''),
        createdAt: order.created_at,
        totalAmount: Number(order.total_amount ?? order.subtotal ?? 0),
        orderStatus: displayStatus,
        paymentStatus: paymentStatus,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        metrics: {
          totalRevenue,
          totalOrders,
          paidOrdersCount,
          pendingOrdersCount,
          cancelledOrdersCount,
          totalCustomers,
          availableInventory,
          totalTrackedSkus: inventoryRows.length,
        },
        lowStockItems,
        recentOrders,
        summary: {
          revenue7d,
          orders7d,
          revenue30d,
          orders30d,
          avgOrderValue,
        },
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Admin dashboard API fatal error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while loading dashboard metrics.' },
      { status: 500 }
    );
  }
}
