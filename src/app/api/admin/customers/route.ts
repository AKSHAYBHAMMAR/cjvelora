import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/adminAuth';
import { AdminCustomerSummary } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const { admin, supabase: db, error: authErr, status: authStatus } = await authenticateAdmin(req);
    if (!admin || !db) {
      return NextResponse.json({ success: false, error: authErr }, { status: authStatus });
    }

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const filter = (searchParams.get('filter') || 'all').trim().toLowerCase();
    const sort = (searchParams.get('sort') || 'newest').trim().toLowerCase();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10) || 25));

    // 1. Fetch orders from database with authenticated admin client
    const { data: orders, error: ordersError } = await db
      .from('orders')
      .select('id, order_number, customer_id, customer_name, customer_email, customer_phone, shipping_name, shipping_phone, total_amount, subtotal, payment_status, order_status, status, created_at')
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Error fetching orders for customer aggregation:', ordersError);
      return NextResponse.json(
        { success: false, error: 'Unable to query orders database.' },
        { status: 500 }
      );
    }

    const allOrders = orders || [];

    // 2. Aggregate orders by unique customer identity
    // Grouping strategy: use customer_id (UUID) when present, otherwise fallback to normalized email
    const customerMap = new Map<string, {
      id: string;
      name: string;
      email: string;
      phone?: string;
      orderDates: number[];
      ordersCount: number;
      paidOrdersCount: number;
      pendingOrdersCount: number;
      cancelledOrdersCount: number;
      totalSpent: number;
    }>();

    for (const order of allOrders) {
      const email = (order.customer_email || '').trim().toLowerCase();
      const customerId = order.customer_id ? String(order.customer_id) : (email || `guest-${order.id}`);

      if (!customerMap.has(customerId)) {
        customerMap.set(customerId, {
          id: customerId,
          name: (order.customer_name || order.shipping_name || '').trim(),
          email: email || 'No email provided',
          phone: order.customer_phone || order.shipping_phone || undefined,
          orderDates: [],
          ordersCount: 0,
          paidOrdersCount: 0,
          pendingOrdersCount: 0,
          cancelledOrdersCount: 0,
          totalSpent: 0,
        });
      }

      const cust = customerMap.get(customerId)!;

      // Prefer latest complete name and phone if previous was empty
      if (!cust.name && (order.customer_name || order.shipping_name)) {
        cust.name = (order.customer_name || order.shipping_name).trim();
      }
      if (!cust.phone && (order.customer_phone || order.shipping_phone)) {
        cust.phone = (order.customer_phone || order.shipping_phone).trim();
      }

      cust.ordersCount++;

      const createdAtMs = new Date(order.created_at || Date.now()).getTime();
      cust.orderDates.push(createdAtMs);

      const pStatus = String(order.payment_status || 'pending').toLowerCase();
      const oStatus = String(order.order_status || order.status || 'pending').toLowerCase();
      const amount = Number(order.total_amount ?? order.subtotal ?? 0);

      if (pStatus === 'paid') {
        cust.paidOrdersCount++;
        cust.totalSpent += amount;
      } else if (pStatus === 'pending' || oStatus === 'pending') {
        cust.pendingOrdersCount++;
      }

      if (oStatus === 'cancelled') {
        cust.cancelledOrdersCount++;
      }
    }

    // Convert aggregated map into AdminCustomerSummary items
    const rawCustomers: AdminCustomerSummary[] = [];

    for (const item of Array.from(customerMap.values())) {
      item.orderDates.sort((a, b) => a - b);
      const earliest = item.orderDates[0];
      const latest = item.orderDates[item.orderDates.length - 1];

      const customerSince = earliest ? new Date(earliest).toISOString() : new Date().toISOString();
      const lastOrderDate = latest ? new Date(latest).toISOString() : undefined;
      const avgOrderValue = item.paidOrdersCount > 0
        ? Math.round(item.totalSpent / item.paidOrdersCount)
        : 0;

      // Resolve friendly name fallback
      let displayName = item.name;
      if (!displayName || displayName === 'Client' || displayName === 'Guest Client') {
        if (item.email && item.email.includes('@')) {
          const username = item.email.split('@')[0];
          displayName = username.charAt(0).toUpperCase() + username.slice(1);
        } else {
          displayName = 'Client';
        }
      }

      rawCustomers.push({
        id: item.id,
        name: displayName,
        email: item.email,
        phone: item.phone,
        customerSince,
        lastOrderDate,
        totalOrders: item.ordersCount,
        paidOrdersCount: item.paidOrdersCount,
        pendingOrdersCount: item.pendingOrdersCount,
        cancelledOrdersCount: item.cancelledOrdersCount,
        totalSpent: Math.round(item.totalSpent),
        avgOrderValue,
      });
    }

    // 3. Compute High-Level Metrics (before search/pagination)
    const totalCustomersCount = rawCustomers.length;
    let overallTotalSpent = 0;
    let repeatCustomersCount = 0;

    for (const c of rawCustomers) {
      overallTotalSpent += c.totalSpent;
      if (c.totalOrders > 1) {
        repeatCustomersCount++;
      }
    }

    const overallAvgCustomerValue = totalCustomersCount > 0
      ? Math.round(overallTotalSpent / totalCustomersCount)
      : 0;

    // 4. Apply Search Filter
    let filtered = rawCustomers;
    if (search) {
      filtered = filtered.filter((c) => {
        const nameMatch = c.name.toLowerCase().includes(search);
        const emailMatch = c.email.toLowerCase().includes(search);
        const phoneMatch = c.phone ? c.phone.toLowerCase().includes(search) : false;
        return nameMatch || emailMatch || phoneMatch;
      });
    }

    // 5. Apply Status/Cohort Filter
    const nowMs = Date.now();
    const thirtyDaysAgoMs = nowMs - 30 * 24 * 60 * 60 * 1000;

    if (filter === 'with-orders') {
      filtered = filtered.filter((c) => c.totalOrders > 0);
    } else if (filter === 'no-orders') {
      filtered = filtered.filter((c) => c.totalOrders === 0);
    } else if (filter === 'high-value') {
      // High value: Customers who have spent more than 5000 INR or top quartile
      filtered = filtered.filter((c) => c.totalSpent >= 5000);
    } else if (filter === 'recent') {
      // Recent customers: registered or placed order in last 30 days
      filtered = filtered.filter((c) => {
        const sinceMs = new Date(c.customerSince).getTime();
        const lastOrderMs = c.lastOrderDate ? new Date(c.lastOrderDate).getTime() : 0;
        return sinceMs >= thirtyDaysAgoMs || lastOrderMs >= thirtyDaysAgoMs;
      });
    }

    // 6. Apply Sorting
    filtered.sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return new Date(a.customerSince).getTime() - new Date(b.customerSince).getTime();
        case 'highest-spent':
          return b.totalSpent - a.totalSpent;
        case 'most-orders':
          return b.totalOrders - a.totalOrders;
        case 'recent-order': {
          const aTime = a.lastOrderDate ? new Date(a.lastOrderDate).getTime() : 0;
          const bTime = b.lastOrderDate ? new Date(b.lastOrderDate).getTime() : 0;
          return bTime - aTime;
        }
        case 'newest':
        default:
          return new Date(b.customerSince).getTime() - new Date(a.customerSince).getTime();
      }
    });

    // 7. Apply Pagination
    const totalFiltered = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / limit));
    const startIndex = (page - 1) * limit;
    const paginatedCustomers = filtered.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      success: true,
      customers: paginatedCustomers,
      pagination: {
        page,
        limit,
        total: totalFiltered,
        totalPages,
      },
      metrics: {
        totalCustomers: totalCustomersCount,
        totalSpent: overallTotalSpent,
        avgCustomerValue: overallAvgCustomerValue,
        repeatCustomersCount,
      },
    });
  } catch (err: any) {
    console.error('Unhandled error in GET /api/admin/customers:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to process customers query.' },
      { status: 500 }
    );
  }
}
