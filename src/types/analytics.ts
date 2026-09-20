export type AnalyticsTimeframe = '7d' | '30d' | '90d' | '12m' | 'custom';

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface MetricComparison {
  value: number;
  previousValue: number | null;
  percentageChange: number | null; // null if previousValue is 0 or not calculable
}

export interface KeyMetrics {
  totalRevenue: MetricComparison;
  totalOrders: MetricComparison;
  avgOrderValue: MetricComparison;
  itemsSold: MetricComparison;
  totalCustomers: MetricComparison;
  newCustomers: number;
  repeatCustomers: number;
}

export interface TimeSeriesPoint {
  date: string;       // Formatted short label e.g., "Sep 14" or "Week 38" or "Aug 26"
  fullDate: string;   // ISO or YYYY-MM-DD
  revenue: number;
  orders: number;
}

export interface CategorySale {
  categoryId: string;
  name: string;
  slug: string;
  revenue: number;
  orders: number;
  unitsSold: number;
  percentOfTotal: number;
}

export interface TopProduct {
  productId: string;
  name: string;
  slug?: string;
  image?: string;
  unitsSold: number;
  orders: number;
  revenue: number;
  categoryName?: string;
}

export interface CustomerAnalytics {
  totalPurchasingCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  repeatCustomerRate: number; // percentage 0 - 100
  avgCustomerSpend: number;
}

export interface OrderStatusDistribution {
  status: string;
  count: number;
  percentage: number;
}

export interface PaymentStatusDistribution {
  status: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface TopCoupon {
  code: string;
  usageCount: number;
  totalDiscountAmount: number;
  revenue: number;
}

export interface DiscountAnalytics {
  ordersUsingDiscounts: number;
  totalDiscountGiven: number;
  discountedOrdersRevenue: number;
  mostUsedCoupons: TopCoupon[];
}

export interface LowStockAlertItem {
  productId: string;
  name: string;
  slug?: string;
  image?: string;
  availableQuantity: number;
  unitsSold: number;
  lowStockThreshold: number;
}

export interface InventoryInsight {
  currentInventoryValue: number;
  unitsSold: number;
  lowStockProductsCount: number;
  outOfStockProductsCount: number;
  fastMovingLowStock: LowStockAlertItem[];
}

export interface AnalyticsData {
  timeframe: AnalyticsTimeframe;
  dateRange: DateRange;
  previousDateRange: DateRange | null;
  hasOrders: boolean;
  metrics: KeyMetrics;
  revenueTimeSeries: TimeSeriesPoint[];
  categorySales: CategorySale[];
  topProducts: TopProduct[];
  customerAnalytics: CustomerAnalytics;
  orderStatuses: OrderStatusDistribution[];
  paymentStatuses: PaymentStatusDistribution[];
  discountAnalytics: DiscountAnalytics;
  inventoryInsight: InventoryInsight;
  updatedAt: string;
}

export interface AnalyticsApiResponse {
  success: boolean;
  data?: AnalyticsData;
  error?: string;
}
