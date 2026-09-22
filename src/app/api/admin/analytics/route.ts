import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/adminAuth';
import {
  AnalyticsTimeframe,
  AnalyticsData,
  TimeSeriesPoint,
  CategorySale,
  TopProduct,
  OrderStatusDistribution,
  PaymentStatusDistribution,
  TopCoupon,
  LowStockAlertItem,
} from '@/types/analytics';

/**
 * Helper to calculate start and end dates based on timeframe parameter.
 */
function resolveDateRanges(
  timeframe: AnalyticsTimeframe,
  customStart?: string | null,
  customEnd?: string | null
): {
  currentStart: Date;
  currentEnd: Date;
  previousStart: Date;
  previousEnd: Date;
  bucketType: 'daily' | 'weekly' | 'monthly';
  error?: string;
} {
  const now = new Date();

  if (timeframe === 'custom') {
    if (!customStart || !customEnd) {
      return {
        currentStart: now,
        currentEnd: now,
        previousStart: now,
        previousEnd: now,
        bucketType: 'daily',
        error: 'Both startDate and endDate are required for custom date range.',
      };
    }

    const start = new Date(customStart);
    const end = new Date(customEnd);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return {
        currentStart: now,
        currentEnd: now,
        previousStart: now,
        previousEnd: now,
        bucketType: 'daily',
        error: 'Invalid date format provided for custom range.',
      };
    }

    // Set end to the end of that day if only YYYY-MM-DD was passed
    if (customEnd.length === 10) {
      end.setHours(23, 59, 59, 999);
    }
    if (customStart.length === 10) {
      start.setHours(0, 0, 0, 0);
    }

    if (start.getTime() > end.getTime()) {
      return {
        currentStart: now,
        currentEnd: now,
        previousStart: now,
        previousEnd: now,
        bucketType: 'daily',
        error: 'Start date must be before or equal to end date.',
      };
    }

    // Guard rails
    const minAllowed = new Date('2020-01-01T00:00:00Z');
    const maxAllowed = new Date(now.getTime() + 24 * 60 * 60 * 1000); // allow up to 1 day ahead for timezone slack
    if (start < minAllowed) {
      return {
        currentStart: now,
        currentEnd: now,
        previousStart: now,
        previousEnd: now,
        bucketType: 'daily',
        error: 'Start date cannot be earlier than year 2020.',
      };
    }
    if (end > maxAllowed) {
      return {
        currentStart: now,
        currentEnd: now,
        previousStart: now,
        previousEnd: now,
        bucketType: 'daily',
        error: 'End date cannot be in the future.',
      };
    }

    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 365 * 5) {
      return {
        currentStart: now,
        currentEnd: now,
        previousStart: now,
        previousEnd: now,
        bucketType: 'daily',
        error: 'Custom range cannot exceed 5 years.',
      };
    }

    const durationMs = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime());
    const prevStart = new Date(start.getTime() - durationMs);

    let bucketType: 'daily' | 'weekly' | 'monthly' = 'daily';
    if (diffDays > 180) {
      bucketType = 'monthly';
    } else if (diffDays > 31) {
      bucketType = 'weekly';
    }

    return {
      currentStart: start,
      currentEnd: end,
      previousStart: prevStart,
      previousEnd: prevEnd,
      bucketType,
    };
  }

  // Predefined ranges
  const currentEnd = new Date(now);
  let days = 30;
  let bucketType: 'daily' | 'weekly' | 'monthly' = 'daily';

  switch (timeframe) {
    case '7d':
      days = 7;
      bucketType = 'daily';
      break;
    case '30d':
      days = 30;
      bucketType = 'daily';
      break;
    case '90d':
      days = 90;
      bucketType = 'weekly';
      break;
    case '12m':
      days = 365;
      bucketType = 'monthly';
      break;
    default:
      days = 30;
      bucketType = 'daily';
  }

  const durationMs = days * 24 * 60 * 60 * 1000;
  const currentStart = new Date(currentEnd.getTime() - durationMs);
  const previousEnd = new Date(currentStart.getTime());
  const previousStart = new Date(currentStart.getTime() - durationMs);

  return {
    currentStart,
    currentEnd,
    previousStart,
    previousEnd,
    bucketType,
  };
}

/**
 * Calculates percentage change between two values.
 * Returns null if baseline is 0 or comparison cannot be made reliably.
 */
function calculateChange(current: number, previous: number | null): number | null {
  if (previous === null || previous <= 0) {
    return null;
  }
  const change = ((current - previous) / previous) * 100;
  return isFinite(change) ? Math.round(change * 10) / 10 : null;
}

/**
 * Normalizes customer identity from order row:
 * Uses customer_id if valid UUID, otherwise lowercase email, or fallback to guest id.
 */
function getCustomerKey(order: any): string {
  if (order.customer_id && String(order.customer_id).trim()) {
    return String(order.customer_id).trim();
  }
  if (order.customer_email && String(order.customer_email).trim()) {
    return String(order.customer_email).trim().toLowerCase();
  }
  return `guest-${order.id}`;
}

export async function GET(req: NextRequest) {
  try {
    const { admin, supabase: db, error: authErr, status: authStatus } = await authenticateAdmin(req);
    if (!admin || !db) {
      return NextResponse.json({ success: false, error: authErr }, { status: authStatus });
    }

    const { searchParams } = new URL(req.url);
    const timeframeParam = (searchParams.get('timeframe') || '30d') as AnalyticsTimeframe;
    const customStartParam = searchParams.get('startDate');
    const customEndParam = searchParams.get('endDate');

    const validTimeframes: AnalyticsTimeframe[] = ['7d', '30d', '90d', '12m', 'custom'];
    const timeframe = validTimeframes.includes(timeframeParam) ? timeframeParam : '30d';

    const {
      currentStart,
      currentEnd,
      previousStart,
      previousEnd,
      bucketType,
      error: rangeError,
    } = resolveDateRanges(timeframe, customStartParam, customEndParam);

    if (rangeError) {
      return NextResponse.json({ success: false, error: rangeError }, { status: 400 });
    }

    const currentStartIso = currentStart.toISOString();
    const currentEndIso = currentEnd.toISOString();
    const previousStartIso = previousStart.toISOString();

    // Parallel Authoritative Queries with authenticated admin context
    const [
      allRecentOrdersRes,
      historicalPriorOrdersRes,
      orderItemsRes,
      productsRes,
      categoriesRes,
      inventoryRes,
    ] = await Promise.all([
      // 1. Orders spanning from previousStart to currentEnd (covers current & previous periods)
      db
        .from('orders')
        .select(
          'id, order_number, customer_id, customer_email, total_amount, subtotal, discount, discount_amount, discount_code, shipping_fee, payment_status, order_status, status, created_at'
        )
        .gte('created_at', previousStartIso)
        .lte('created_at', currentEndIso)
        .order('created_at', { ascending: true }),

      // 2. Prior orders before currentStart to identify repeat/returning customers
      db
        .from('orders')
        .select('customer_id, customer_email')
        .lt('created_at', currentStartIso),

      // 3. Order items for products sold
      db
        .from('order_items')
        .select('id, order_id, product_id, product_name, quantity, unit_price, subtotal, created_at'),

      // 4. Products catalog
      db
        .from('products')
        .select('id, name, slug, price, category_id, image_url, image, in_stock, is_published'),

      // 5. Categories
      db.from('categories').select('id, name, slug'),

      // 6. Inventory levels
      db
        .from('inventory')
        .select('id, product_id, quantity, reserved_quantity, low_stock_threshold'),
    ]);

    if (allRecentOrdersRes.error) {
      console.error('Error fetching orders for analytics:', allRecentOrdersRes.error);
      return NextResponse.json(
        { success: false, error: 'Database error fetching order history.' },
        { status: 500 }
      );
    }

    const allRecentOrders = allRecentOrdersRes.data || [];
    const priorOrders = historicalPriorOrdersRes.data || [];
    const allOrderItems = orderItemsRes.data || [];
    const products = productsRes.data || [];
    const categories = categoriesRes.data || [];
    const inventory = inventoryRes.data || [];

    // Separate orders into current period and previous period
    const currentOrders: any[] = [];
    const previousOrders: any[] = [];

    const currentStartTime = currentStart.getTime();
    const currentEndTime = currentEnd.getTime();
    const previousStartTime = previousStart.getTime();

    for (const order of allRecentOrders) {
      const orderTime = new Date(order.created_at).getTime();
      if (orderTime >= currentStartTime && orderTime <= currentEndTime) {
        currentOrders.push(order);
      } else if (orderTime >= previousStartTime && orderTime < currentStartTime) {
        previousOrders.push(order);
      }
    }

    // Set of customer identities who placed an order before current period
    const priorCustomerKeys = new Set<string>();
    for (const order of priorOrders) {
      const key = getCustomerKey(order);
      if (key) priorCustomerKeys.add(key);
    }

    // Product & Category Lookup Maps
    const categoryMap = new Map<string, { id: string; name: string; slug: string }>();
    for (const cat of categories) {
      categoryMap.set(String(cat.id), cat);
    }

    const productMap = new Map<string, any>();
    for (const p of products) {
      productMap.set(String(p.id), p);
    }

    // Calculate Current Period Metrics
    let currentRevenue = 0;
    let currentPaidOrders = 0;
    let currentTotalOrders = currentOrders.length;
    const currentPurchasingCustomerKeys = new Set<string>();
    const currentCustomerOrderCount = new Map<string, number>();

    // Status counts
    const orderStatusCounts: Record<string, number> = {
      pending: 0,
      confirmed: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      refunded: 0,
    };

    const paymentStatusCounts: Record<string, { count: number; amount: number }> = {
      paid: { count: 0, amount: 0 },
      pending: { count: 0, amount: 0 },
      failed: { count: 0, amount: 0 },
      refunded: { count: 0, amount: 0 },
      partially_refunded: { count: 0, amount: 0 },
    };

    // Discount tracking
    let ordersUsingDiscounts = 0;
    let totalDiscountGiven = 0;
    let discountedOrdersRevenue = 0;
    const couponMap = new Map<
      string,
      { code: string; usageCount: number; totalDiscountAmount: number; revenue: number }
    >();

    const currentOrderIdsSet = new Set<string>();

    for (const order of currentOrders) {
      currentOrderIdsSet.add(String(order.id));

      const pStatus = String(order.payment_status || 'pending').toLowerCase();
      const oStatus = String(order.order_status || order.status || 'pending').toLowerCase();
      const totalAmount = Number(order.total_amount ?? order.subtotal ?? 0);
      const discount = Number(order.discount ?? order.discount_amount ?? 0);
      const discountCode = order.discount_code ? String(order.discount_code).trim().toUpperCase() : null;

      // Revenue: paid orders that are NOT cancelled or refunded
      const isValidCompletedPayment =
        pStatus === 'paid' && oStatus !== 'cancelled' && oStatus !== 'refunded';

      if (isValidCompletedPayment) {
        currentRevenue += totalAmount;
        currentPaidOrders++;
      }

      // Customer identity
      const customerKey = getCustomerKey(order);
      currentPurchasingCustomerKeys.add(customerKey);
      currentCustomerOrderCount.set(
        customerKey,
        (currentCustomerOrderCount.get(customerKey) || 0) + 1
      );

      // Order status distribution
      if (orderStatusCounts[oStatus] !== undefined) {
        orderStatusCounts[oStatus]++;
      } else {
        orderStatusCounts[oStatus] = (orderStatusCounts[oStatus] || 0) + 1;
      }

      // Payment status distribution
      if (!paymentStatusCounts[pStatus]) {
        paymentStatusCounts[pStatus] = { count: 0, amount: 0 };
      }
      paymentStatusCounts[pStatus].count++;
      paymentStatusCounts[pStatus].amount += totalAmount;

      // Discounts
      if (discount > 0 || discountCode) {
        ordersUsingDiscounts++;
        totalDiscountGiven += discount;
        discountedOrdersRevenue += totalAmount;

        if (discountCode) {
          if (!couponMap.has(discountCode)) {
            couponMap.set(discountCode, {
              code: discountCode,
              usageCount: 0,
              totalDiscountAmount: 0,
              revenue: 0,
            });
          }
          const c = couponMap.get(discountCode)!;
          c.usageCount++;
          c.totalDiscountAmount += discount;
          c.revenue += totalAmount;
        }
      }
    }

    // Order Items Analysis (Items sold, Top Products, Category Sales)
    let currentUnitsSold = 0;
    const productSalesMap = new Map<
      string,
      {
        productId: string;
        name: string;
        slug?: string;
        image?: string;
        unitsSold: number;
        ordersSet: Set<string>;
        revenue: number;
        categoryName?: string;
      }
    >();

    const categorySalesMap = new Map<
      string,
      {
        categoryId: string;
        name: string;
        slug: string;
        revenue: number;
        ordersSet: Set<string>;
        unitsSold: number;
      }
    >();

    for (const item of allOrderItems) {
      if (!currentOrderIdsSet.has(String(item.order_id))) {
        continue;
      }

      const qty = Number(item.quantity ?? 1);
      const subtotal = Number(item.subtotal ?? (Number(item.unit_price ?? 0) * qty));
      currentUnitsSold += qty;

      const pId = String(item.product_id || '');
      const prod = productMap.get(pId);
      const catId = prod?.category_id ? String(prod.category_id) : 'uncategorized';
      const cat = categoryMap.get(catId);

      // Top Products Aggregation
      if (!productSalesMap.has(pId)) {
        productSalesMap.set(pId, {
          productId: pId,
          name: item.product_name || prod?.name || `Product #${pId.slice(0, 6)}`,
          slug: prod?.slug,
          image: prod?.image_url || prod?.image || '/images/products/tote-bag.jpg',
          unitsSold: 0,
          ordersSet: new Set<string>(),
          revenue: 0,
          categoryName: cat?.name || 'Artisan Collection',
        });
      }
      const pEntry = productSalesMap.get(pId)!;
      pEntry.unitsSold += qty;
      pEntry.ordersSet.add(String(item.order_id));
      pEntry.revenue += subtotal;

      // Category Sales Aggregation
      if (!categorySalesMap.has(catId)) {
        categorySalesMap.set(catId, {
          categoryId: catId,
          name: cat?.name || 'Uncategorized / Direct',
          slug: cat?.slug || 'uncategorized',
          revenue: 0,
          ordersSet: new Set<string>(),
          unitsSold: 0,
        });
      }
      const catEntry = categorySalesMap.get(catId)!;
      catEntry.revenue += subtotal;
      catEntry.ordersSet.add(String(item.order_id));
      catEntry.unitsSold += qty;
    }

    // Top Products list sorted by units sold descending
    const topProducts: TopProduct[] = Array.from(productSalesMap.values())
      .map((p) => ({
        productId: p.productId,
        name: p.name,
        slug: p.slug,
        image: p.image,
        unitsSold: p.unitsSold,
        orders: p.ordersSet.size,
        revenue: Math.round(p.revenue),
        categoryName: p.categoryName,
      }))
      .sort((a, b) => b.unitsSold - a.unitsSold || b.revenue - a.revenue)
      .slice(0, 10);

    // Category Sales list with percentage
    const totalCategoryRevenue = Array.from(categorySalesMap.values()).reduce(
      (acc, c) => acc + c.revenue,
      0
    );

    const categorySales: CategorySale[] = Array.from(categorySalesMap.values())
      .map((c) => ({
        categoryId: c.categoryId,
        name: c.name,
        slug: c.slug,
        revenue: Math.round(c.revenue),
        orders: c.ordersSet.size,
        unitsSold: c.unitsSold,
        percentOfTotal:
          totalCategoryRevenue > 0
            ? Math.round((c.revenue / totalCategoryRevenue) * 1000) / 10
            : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Customer Cohort Calculations
    let newCustomers = 0;
    let returningCustomers = 0;

    for (const [customerKey, countInPeriod] of Array.from(currentCustomerOrderCount.entries())) {
      if (priorCustomerKeys.has(customerKey)) {
        // Customer had already ordered before this period
        returningCustomers++;
      } else {
        // Customer's first ever order is in this period
        newCustomers++;
        // If they ordered multiple times in this period, they are also repeat
        if (countInPeriod > 1) {
          returningCustomers++;
        }
      }
    }

    const totalPurchasingCustomers = currentPurchasingCustomerKeys.size;
    const repeatCustomerRate =
      totalPurchasingCustomers > 0
        ? Math.round((returningCustomers / totalPurchasingCustomers) * 1000) / 10
        : 0;

    const avgCustomerSpend =
      totalPurchasingCustomers > 0
        ? Math.round(currentRevenue / totalPurchasingCustomers)
        : 0;

    // Previous Period Metrics for Comparison
    let previousRevenue = 0;
    let previousPaidOrders = 0;
    let previousTotalOrders = previousOrders.length;
    const previousPurchasingCustomerKeys = new Set<string>();

    for (const order of previousOrders) {
      const pStatus = String(order.payment_status || 'pending').toLowerCase();
      const oStatus = String(order.order_status || order.status || 'pending').toLowerCase();
      const totalAmount = Number(order.total_amount ?? order.subtotal ?? 0);

      if (pStatus === 'paid' && oStatus !== 'cancelled' && oStatus !== 'refunded') {
        previousRevenue += totalAmount;
        previousPaidOrders++;
      }
      previousPurchasingCustomerKeys.add(getCustomerKey(order));
    }

    // Previous items sold (from allOrderItems for previous order ids)
    const prevOrderIdsSet = new Set(previousOrders.map((o) => String(o.id)));
    let previousUnitsSold = 0;
    for (const item of allOrderItems) {
      if (prevOrderIdsSet.has(String(item.order_id))) {
        previousUnitsSold += Number(item.quantity ?? 1);
      }
    }

    const currentAOV =
      currentPaidOrders > 0 ? Math.round(currentRevenue / currentPaidOrders) : 0;
    const previousAOV =
      previousPaidOrders > 0 ? Math.round(previousRevenue / previousPaidOrders) : null;

    // Time Series Generation
    const timeSeriesMap = new Map<string, { date: string; fullDate: string; revenue: number; orders: number }>();

    // Pre-populate time buckets so every day/week/month in range is represented
    if (bucketType === 'daily') {
      const temp = new Date(currentStart);
      while (temp <= currentEnd) {
        const key = temp.toISOString().slice(0, 10);
        const label = temp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        timeSeriesMap.set(key, { date: label, fullDate: key, revenue: 0, orders: 0 });
        temp.setDate(temp.getDate() + 1);
      }
    } else if (bucketType === 'weekly') {
      const temp = new Date(currentStart);
      let weekNum = 1;
      while (temp <= currentEnd) {
        const key = temp.toISOString().slice(0, 10);
        const label = `W${weekNum} (${temp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
        timeSeriesMap.set(key, { date: label, fullDate: key, revenue: 0, orders: 0 });
        temp.setDate(temp.getDate() + 7);
        weekNum++;
      }
    } else {
      // Monthly
      const temp = new Date(currentStart);
      while (temp <= currentEnd) {
        const key = temp.toISOString().slice(0, 7); // YYYY-MM
        const label = temp.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        timeSeriesMap.set(key, { date: label, fullDate: key, revenue: 0, orders: 0 });
        temp.setMonth(temp.getMonth() + 1);
      }
    }

    // Populate actual order data into time buckets
    for (const order of currentOrders) {
      const orderDate = new Date(order.created_at);
      const pStatus = String(order.payment_status || 'pending').toLowerCase();
      const oStatus = String(order.order_status || order.status || 'pending').toLowerCase();
      const totalAmount = Number(order.total_amount ?? order.subtotal ?? 0);
      const isValidPayment = pStatus === 'paid' && oStatus !== 'cancelled' && oStatus !== 'refunded';

      let targetKey: string | null = null;
      if (bucketType === 'daily') {
        targetKey = orderDate.toISOString().slice(0, 10);
      } else if (bucketType === 'weekly') {
        // Find closest week bucket
        let closestKey: string | null = null;
        let minDiff = Infinity;
        for (const bucketKey of Array.from(timeSeriesMap.keys())) {
          const diff = Math.abs(orderDate.getTime() - new Date(bucketKey).getTime());
          if (diff < minDiff) {
            minDiff = diff;
            closestKey = bucketKey;
          }
        }
        targetKey = closestKey;
      } else {
        targetKey = orderDate.toISOString().slice(0, 7);
      }

      if (targetKey && timeSeriesMap.has(targetKey)) {
        const bucket = timeSeriesMap.get(targetKey)!;
        bucket.orders += 1;
        if (isValidPayment) {
          bucket.revenue += totalAmount;
        }
      }
    }

    const revenueTimeSeries: TimeSeriesPoint[] = Array.from(timeSeriesMap.values()).map(
      (pt) => ({
        date: pt.date,
        fullDate: pt.fullDate,
        revenue: Math.round(pt.revenue),
        orders: pt.orders,
      })
    );

    // Order & Payment Status Distribution Arrays
    const totalStatusOrders = currentTotalOrders || 1;
    const orderStatuses: OrderStatusDistribution[] = Object.entries(orderStatusCounts)
      .filter(([_, count]) => count > 0 || currentTotalOrders === 0)
      .map(([status, count]) => ({
        status,
        count,
        percentage: Math.round((count / totalStatusOrders) * 1000) / 10,
      }));

    const paymentStatuses: PaymentStatusDistribution[] = Object.entries(paymentStatusCounts)
      .filter(([_, data]) => data.count > 0 || currentTotalOrders === 0)
      .map(([status, data]) => ({
        status,
        count: data.count,
        amount: Math.round(data.amount),
        percentage: Math.round((data.count / totalStatusOrders) * 1000) / 10,
      }));

    // Inventory Insights Calculation
    let currentInventoryValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    const fastMovingLowStock: LowStockAlertItem[] = [];

    // Map inventory row to product
    const inventoryMap = new Map<string, any>();
    for (const inv of inventory) {
      const pId = String(inv.product_id);
      inventoryMap.set(pId, inv);
      const qty = Number(inv.quantity ?? 0);
      const reserved = Number(inv.reserved_quantity ?? 0);
      const available = Math.max(0, qty - reserved);
      const threshold = typeof inv.low_stock_threshold === 'number' ? inv.low_stock_threshold : 5;

      const prod = productMap.get(pId);
      const price = prod?.price ? Number(prod.price) : 0;
      currentInventoryValue += available * price;

      if (available === 0) {
        outOfStockCount++;
      } else if (available <= threshold) {
        lowStockCount++;
      }
    }

    // Check fast moving products with low stock (unitsSold in top 15 and available <= threshold)
    for (const prodSale of topProducts) {
      const inv = inventoryMap.get(prodSale.productId);
      if (inv) {
        const qty = Number(inv.quantity ?? 0);
        const reserved = Number(inv.reserved_quantity ?? 0);
        const available = Math.max(0, qty - reserved);
        const threshold = typeof inv.low_stock_threshold === 'number' ? inv.low_stock_threshold : 5;

        if (available <= threshold) {
          fastMovingLowStock.push({
            productId: prodSale.productId,
            name: prodSale.name,
            slug: prodSale.slug,
            image: prodSale.image,
            availableQuantity: available,
            unitsSold: prodSale.unitsSold,
            lowStockThreshold: threshold,
          });
        }
      }
    }

    // Top Coupons
    const mostUsedCoupons: TopCoupon[] = Array.from(couponMap.values())
      .map((c) => ({
        code: c.code,
        usageCount: c.usageCount,
        totalDiscountAmount: Math.round(c.totalDiscountAmount),
        revenue: Math.round(c.revenue),
      }))
      .sort((a, b) => b.usageCount - a.usageCount || b.totalDiscountAmount - a.totalDiscountAmount)
      .slice(0, 5);

    const hasOrders = currentOrders.length > 0;

    const payload: AnalyticsData = {
      timeframe,
      dateRange: {
        startDate: currentStartIso,
        endDate: currentEndIso,
      },
      previousDateRange: {
        startDate: previousStartIso,
        endDate: previousEnd.toISOString(),
      },
      hasOrders,
      metrics: {
        totalRevenue: {
          value: Math.round(currentRevenue),
          previousValue: previousRevenue > 0 ? Math.round(previousRevenue) : null,
          percentageChange: calculateChange(currentRevenue, previousRevenue),
        },
        totalOrders: {
          value: currentTotalOrders,
          previousValue: previousTotalOrders > 0 ? previousTotalOrders : null,
          percentageChange: calculateChange(currentTotalOrders, previousTotalOrders),
        },
        avgOrderValue: {
          value: currentAOV,
          previousValue: previousAOV,
          percentageChange: calculateChange(currentAOV, previousAOV),
        },
        itemsSold: {
          value: currentUnitsSold,
          previousValue: previousUnitsSold > 0 ? previousUnitsSold : null,
          percentageChange: calculateChange(currentUnitsSold, previousUnitsSold),
        },
        totalCustomers: {
          value: totalPurchasingCustomers,
          previousValue: previousPurchasingCustomerKeys.size > 0 ? previousPurchasingCustomerKeys.size : null,
          percentageChange: calculateChange(
            totalPurchasingCustomers,
            previousPurchasingCustomerKeys.size
          ),
        },
        newCustomers,
        repeatCustomers: returningCustomers,
      },
      revenueTimeSeries,
      categorySales,
      topProducts,
      customerAnalytics: {
        totalPurchasingCustomers,
        newCustomers,
        returningCustomers,
        repeatCustomerRate,
        avgCustomerSpend,
      },
      orderStatuses,
      paymentStatuses,
      discountAnalytics: {
        ordersUsingDiscounts,
        totalDiscountGiven: Math.round(totalDiscountGiven),
        discountedOrdersRevenue: Math.round(discountedOrdersRevenue),
        mostUsedCoupons,
      },
      inventoryInsight: {
        currentInventoryValue: Math.round(currentInventoryValue),
        unitsSold: currentUnitsSold,
        lowStockProductsCount: lowStockCount,
        outOfStockProductsCount: outOfStockCount,
        fastMovingLowStock,
      },
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: payload,
    });
  } catch (err: any) {
    console.error('Fatal error in /api/admin/analytics:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error processing analytics.' },
      { status: 500 }
    );
  }
}
