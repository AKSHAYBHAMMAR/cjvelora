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

