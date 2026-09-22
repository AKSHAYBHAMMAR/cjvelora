import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/adminAuth';
import { mapSupabaseOrder } from '@/lib/orders';
import { AdminCustomerDetail, AdminCustomerShippingAddress } from '@/types';

export async function GET(
  req: NextRequest,
  { params }: { params: { customerId: string } }
) {
  try {
    const { admin, supabase: db, error: authErr, status: authStatus } = await authenticateAdmin(req);
    if (!admin || !db) {
      return NextResponse.json({ success: false, error: authErr }, { status: authStatus });
    }

    const rawCustomerId = decodeURIComponent(params.customerId || '').trim();
    if (!rawCustomerId) {
      return NextResponse.json({ success: false, error: 'Customer identifier is required.' }, { status: 400 });
    }

    // 1. Query orders matching customer_id (UUID) or fallback customer_email with authenticated client
    let ordersQuery = db
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });

    // Check if rawCustomerId looks like a UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rawCustomerId);

    if (isUuid) {
      ordersQuery = ordersQuery.eq('customer_id', rawCustomerId);
    } else {
      ordersQuery = ordersQuery.ilike('customer_email', rawCustomerId);
    }

    const { data: matchedOrders, error: ordersError } = await ordersQuery;

    if (ordersError) {
      console.error('Error fetching customer orders:', ordersError);
      return NextResponse.json(
        { success: false, error: 'Database query error fetching customer details.' },
        { status: 500 }
      );
    }

    // Fallback search: if UUID search returned no orders, check if customerId matches email
    let finalOrders = matchedOrders || [];
    if (finalOrders.length === 0 && isUuid) {
      const { data: fallbackOrders } = await db
        .from('orders')
        .select('*, order_items(*)')
        .ilike('customer_email', rawCustomerId)
        .order('created_at', { ascending: false });
      if (fallbackOrders && fallbackOrders.length > 0) {
        finalOrders = fallbackOrders;
      }
    }

    if (finalOrders.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Customer not found in order records.' },
        { status: 404 }
      );
    }

    // 2. Aggregate customer details & metrics
    let bestName = '';
    let bestEmail = '';
    let bestPhone: string | undefined = undefined;
    let customerSinceMs = Infinity;
    let lastOrderMs = 0;
    let paidOrdersCount = 0;
    let pendingOrdersCount = 0;
    let cancelledOrdersCount = 0;
    let totalSpent = 0;

    const shippingAddresses: AdminCustomerShippingAddress[] = [];
    const seenAddresses = new Set<string>();

    for (const order of finalOrders) {
      const name = (order.customer_name || order.shipping_name || '').trim();
      if (!bestName && name) bestName = name;

      const email = (order.customer_email || '').trim();
      if (!bestEmail && email) bestEmail = email;

      const phone = (order.customer_phone || order.shipping_phone || '').trim();
      if (!bestPhone && phone) bestPhone = phone;

      const createdMs = new Date(order.created_at || Date.now()).getTime();
      if (createdMs < customerSinceMs) customerSinceMs = createdMs;
      if (createdMs > lastOrderMs) lastOrderMs = createdMs;

      const pStatus = String(order.payment_status || 'pending').toLowerCase();
      const oStatus = String(order.order_status || order.status || 'pending').toLowerCase();
      const amount = Number(order.total_amount ?? order.subtotal ?? 0);

      if (pStatus === 'paid') {
        paidOrdersCount++;
        totalSpent += amount;
      } else if (pStatus === 'pending' || oStatus === 'pending') {
        pendingOrdersCount++;
      }

      if (oStatus === 'cancelled') {
        cancelledOrdersCount++;
      }

      // Collect shipping address if present
      const addrLine = (order.shipping_address_line1 || order.shipping_address || '').trim();
      const city = (order.shipping_city || '').trim();
      const postal = (order.shipping_postal_code || '').trim();
      const addrKey = `${addrLine.toLowerCase()}|${city.toLowerCase()}|${postal.toLowerCase()}`;

      if (addrLine && !seenAddresses.has(addrKey)) {
        seenAddresses.add(addrKey);
        shippingAddresses.push({
          name: order.shipping_name || order.customer_name || undefined,
          phone: order.shipping_phone || order.customer_phone || undefined,
          address: addrLine,
          city: order.shipping_city || undefined,
          state: order.shipping_state || undefined,
          postalCode: order.shipping_postal_code || undefined,
          country: order.shipping_country || 'India',
        });
      }
    }

    // Resolve display name fallback
    if (!bestName || bestName === 'Client' || bestName === 'Guest Client') {
      if (bestEmail && bestEmail.includes('@')) {
        const username = bestEmail.split('@')[0];
        bestName = username.charAt(0).toUpperCase() + username.slice(1);
      } else {
        bestName = 'Client';
      }
    }

    const avgOrderValue = paidOrdersCount > 0 ? Math.round(totalSpent / paidOrdersCount) : 0;

    // Map orders using canonical mapSupabaseOrder
    const mappedOrders = finalOrders.map((row) =>
      mapSupabaseOrder(row, row.order_items || [])
    );

    const customerDetail: AdminCustomerDetail = {
      id: rawCustomerId,
      name: bestName,
      email: bestEmail || 'No email registered',
      phone: bestPhone,
      customerSince: new Date(customerSinceMs === Infinity ? Date.now() : customerSinceMs).toISOString(),
      lastOrderDate: lastOrderMs > 0 ? new Date(lastOrderMs).toISOString() : undefined,
      totalOrders: finalOrders.length,
      paidOrdersCount,
      pendingOrdersCount,
      cancelledOrdersCount,
      totalSpent: Math.round(totalSpent),
      avgOrderValue,
      shippingAddresses,
      orders: mappedOrders,
    };

    return NextResponse.json({
      success: true,
      customer: customerDetail,
    });
  } catch (err: any) {
    console.error('Unhandled error in GET /api/admin/customers/[customerId]:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch customer profile.' },
      { status: 500 }
    );
  }
}
