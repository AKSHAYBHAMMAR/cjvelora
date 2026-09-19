export interface Product {
  id: string;
  name: string;
  category: string;
  categorySlug: string;
  price: number;
  originalPrice?: number;
  description: string;
  longDescription?: string;
  materials: string;
  dimensions?: string;
  careInstructions?: string;
  image: string;
  images: string[];
  badge?: string;
  isMostLoved?: boolean;
  isMadeToOrder?: boolean;
  leadTime?: string;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  colors?: string[];
  slug?: string;
  categoryId?: string;
  isPublished?: boolean;
  uploadedImages?: ProductImageRecord[];
}

export interface ProductImageRecord {
  id: string;
  productId: string;
  storagePath: string;
  publicUrl: string;
  altText: string;
  displayOrder: number;
  createdAt?: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  subtitle: string;
  image: string;
  itemCount: number;
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
  displayOrder: number;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryInput {
  name: string;
  slug?: string;
  description?: string;
  imageUrl?: string;
  isActive?: boolean;
  displayOrder?: number;
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  description?: string;
  imageUrl?: string;
  isActive?: boolean;
  displayOrder?: number;
}

export interface Collection {
  id: string;
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  image: string;
  itemCount: number;
  badge?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedColor?: string;
}

export interface Testimonial {
  id: string;
  name: string;
  initials: string;
  location: string;
  role: string;
  rating: number;
  content: string;
  productName: string;
}

export interface FAQItem {
  question: string;
  answer: string;
  category?: string;
}

export interface InventoryItem {
  id: string;
  productId: string;
  quantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
  updatedAt?: string;
}

export interface ProductInventoryView {
  product: Product;
  inventory: InventoryItem;
  availableQuantity: number;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
}

export interface InventoryAuditLog {
  id: string;
  userId?: string;
  userEmail?: string;
  action: string;
  entityType: string;
  entityId: string;
  productName?: string;
  oldQuantity?: number;
  newQuantity?: number;
  delta?: number;
  reason?: string;
  createdAt: string;
}

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

export interface AdminOrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  lineTotal: number;
  productImage?: string;
  createdAt?: string;
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;

  customerName: string;
  customerEmail: string;
  customerPhone?: string;

  shippingName?: string;
  shippingAddress?: string;
  shippingAddressLine1?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingPostalCode?: string;
  shippingCountry?: string;
  shippingPhone?: string;

  subtotal: number;
  discount: number;
  discountCode?: string;
  shipping: number;
  total: number;

  razorpayOrderId?: string;
  razorpayPaymentId?: string;

  items: AdminOrderItem[];
}

export interface AdminCustomerShippingAddress {
  name?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface AdminCustomerSummary {
  id: string; // customerId (customer_id uuid, or sanitized email identifier if guest)
  name: string;
  email: string;
  phone?: string;
  customerSince: string;
  lastOrderDate?: string;
  totalOrders: number;
  paidOrdersCount: number;
  pendingOrdersCount: number;
  cancelledOrdersCount: number;
  totalSpent: number;
  avgOrderValue: number;
}

export interface AdminCustomerDetail extends AdminCustomerSummary {
  shippingAddresses: AdminCustomerShippingAddress[];
  orders: AdminOrder[];
}

export type DiscountType = 'percentage' | 'fixed_amount';

export interface Discount {
  id: string;
  code: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  minimumOrderAmount: number;
  maximumDiscountAmount?: number | null;
  startAt: string;
  endAt?: string | null;
  usageLimit?: number | null;
  usageCount: number;
  perCustomerLimit?: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDiscountInput {
  code: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  minimumOrderAmount?: number;
  maximumDiscountAmount?: number | null;
  startAt?: string;
  endAt?: string | null;
  usageLimit?: number | null;
  perCustomerLimit?: number | null;
  active?: boolean;
}

export interface UpdateDiscountInput {
  code?: string;
  description?: string;
  discountType?: DiscountType;
  discountValue?: number;
  minimumOrderAmount?: number;
  maximumDiscountAmount?: number | null;
  startAt?: string;
  endAt?: string | null;
  usageLimit?: number | null;
  perCustomerLimit?: number | null;
  active?: boolean;
}

export interface ValidateCouponResult {
  valid: boolean;
  discount?: {
    id: string;
    code: string;
    description: string;
    discountType: DiscountType;
    discountValue: number;
  };
  discountAmount?: number;
  finalTotal?: number;
  message?: string;
  error?: string;
}

