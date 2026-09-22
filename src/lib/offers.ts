import { PromotionalBanner } from '@/types/content';
import { Product } from '@/types';

/**
 * Standard virtual collections available in CJVELORA beyond database categories.
 */
export const STANDARD_COLLECTIONS = [
  { id: 'new-arrivals', name: 'New Arrivals', slug: 'new-arrivals' },
  { id: 'bestsellers', name: 'Bestsellers', slug: 'bestsellers' },
];

/**
 * Determines whether a promotional offer is currently active based on:
 * 1. active = true
 * 2. startDate <= now (if startDate set)
 * 3. endDate >= now (if endDate set)
 * 4. discountValue > 0
 * 5. collection is specified
 */
export function isOfferActive(
  offer: PromotionalBanner | null | undefined,
  referenceTime: Date = new Date()
): boolean {
  if (!offer || !offer.active) return false;

  const nowMs = referenceTime.getTime();

  if (offer.startDate) {
    const startMs = new Date(offer.startDate).getTime();
    if (!isNaN(startMs) && startMs > nowMs) {
      return false; // Future scheduled offer
    }
  }

  if (offer.endDate) {
    const endMs = new Date(offer.endDate).getTime();
    if (!isNaN(endMs) && endMs < nowMs) {
      return false; // Expired offer
    }
  }

  const discountVal = Number(offer.discountValue ?? 0);
  if (isNaN(discountVal) || discountVal <= 0 || discountVal > 100) {
    return false; // Invalid or 0% discount
  }

  // Collection must be configured
  const hasCollection = Boolean(
    (offer.collectionId && offer.collectionId.trim()) ||
    (offer.collectionSlug && offer.collectionSlug.trim()) ||
    (offer.collectionName && offer.collectionName.trim())
  );

  return hasCollection;
}

/**
 * Gets human-readable offer status for admin reporting and preview.
 */
export function getOfferStatus(
  offer: PromotionalBanner | null | undefined,
  referenceTime: Date = new Date()
): 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'DISABLED' {
  if (!offer || !offer.active) return 'DISABLED';

  const nowMs = referenceTime.getTime();

  if (offer.startDate) {
    const startMs = new Date(offer.startDate).getTime();
    if (!isNaN(startMs) && startMs > nowMs) {
      return 'SCHEDULED';
    }
  }

  if (offer.endDate) {
    const endMs = new Date(offer.endDate).getTime();
    if (!isNaN(endMs) && endMs < nowMs) {
      return 'EXPIRED';
    }
  }

  return 'ACTIVE';
}

/**
 * Computes safe integer discount amount and final sale price:
 * discountAmount = round(basePrice * percentage / 100)
 * finalPrice = max(0, basePrice - discountAmount)
 */
export function calculateOfferDiscount(
  basePrice: number,
  discountPercentage: number
): { discountAmount: number; finalPrice: number } {
  const price = Math.max(0, Number(basePrice) || 0);
  const percentage = Math.min(100, Math.max(0, Number(discountPercentage) || 0));

  if (price === 0 || percentage === 0) {
    return { discountAmount: 0, finalPrice: price };
  }

  const discountAmount = Math.round((price * percentage) / 100);
  const finalPrice = Math.max(0, price - discountAmount);

  return { discountAmount, finalPrice };
}

/**
 * Determines whether a given product belongs to the collection associated with the offer.
 */
export function isProductEligibleForOffer(
  product: {
    id: string;
    category?: string;
    categorySlug?: string;
    categoryId?: string;
    isMostLoved?: boolean;
    badge?: string;
  },
  offer: PromotionalBanner | null | undefined
): boolean {
  if (!isOfferActive(offer)) return false;

  const targetId = (offer!.collectionId || '').trim().toLowerCase();
  const targetSlug = (offer!.collectionSlug || '').trim().toLowerCase();
  const targetName = (offer!.collectionName || '').trim().toLowerCase();

  // 1. Virtual Collection: Bestsellers
  if (
    targetSlug === 'bestsellers' ||
    targetSlug === 'most-loved' ||
    targetName === 'bestsellers' ||
    targetName === 'most loved'
  ) {
    return Boolean(
      product.isMostLoved ||
      (product.badge && product.badge.toLowerCase().includes('bestseller'))
    );
  }

  // 2. Virtual Collection: New Arrivals
  if (
    targetSlug === 'new-arrivals' ||
    targetName === 'new arrivals'
  ) {
    const badgeLower = (product.badge || '').toLowerCase();
    const isNew = badgeLower.includes('new') || badgeLower.includes('arrival');
    // If the product explicitly has a New Arrival badge or category matches
    if (isNew) return true;
    if (product.categorySlug?.toLowerCase() === 'new-arrivals') return true;
    if (product.category?.toLowerCase() === 'new arrivals') return true;
    // Default fallback for demo: if collection is New Arrivals, products match by default unless explicitly excluded
    return true;
  }

  // 3. Category ID Match
  if (targetId && product.categoryId && product.categoryId.toLowerCase() === targetId) {
    return true;
  }

  // 4. Category Slug Match
  if (targetSlug && product.categorySlug && product.categorySlug.toLowerCase() === targetSlug) {
    return true;
  }

  // 5. Category Name Match
  if (targetName && product.category && product.category.toLowerCase() === targetName) {
    return true;
  }

  return false;
}

export interface ResolvedOfferPricing {
  isDiscounted: boolean;
  finalPrice: number;
  originalPrice: number;
  discountPercentage: number;
  discountAmount: number;
  offerTitle?: string;
  offerBadge?: string;
}

/**
 * Resolves the dynamic pricing for a product against all active promotional banners.
 * Deterministic precedence: First matching active offer (ordered by displayOrder).
 * Never stacks multiple offers.
 */
export function resolveProductOfferPricing(
  product: Product,
  offers?: PromotionalBanner[] | null,
  referenceTime: Date = new Date()
): ResolvedOfferPricing {
  const basePrice = Number(product.price) || 0;

  if (!offers || offers.length === 0) {
    return {
      isDiscounted: false,
      finalPrice: basePrice,
      originalPrice: basePrice,
      discountPercentage: 0,
      discountAmount: 0,
    };
  }

  // Sort by displayOrder ascending
  const sortedOffers = [...offers].sort(
    (a, b) => Number(a.displayOrder ?? 0) - Number(b.displayOrder ?? 0)
  );

  for (const offer of sortedOffers) {
    if (isOfferActive(offer, referenceTime) && isProductEligibleForOffer(product, offer)) {
      const percentage = Number(offer.discountValue || 0);
      const { discountAmount, finalPrice } = calculateOfferDiscount(basePrice, percentage);

      if (discountAmount > 0) {
        return {
          isDiscounted: true,
          finalPrice,
          originalPrice: basePrice,
          discountPercentage: percentage,
          discountAmount,
          offerTitle: offer.title,
          offerBadge: offer.badge || 'Limited Atelier Edition',
        };
      }
    }
  }

  return {
    isDiscounted: false,
    finalPrice: basePrice,
    originalPrice: basePrice,
    discountPercentage: 0,
    discountAmount: 0,
  };
}

/**
 * Derives the canonical storefront navigation link for the selected collection.
 * No manual URL input needed from admin.
 */
export function getCollectionRoute(
  collectionSlug?: string | null,
  collectionName?: string | null
): string {
  const slug = (collectionSlug || '').trim().toLowerCase();
  const name = (collectionName || '').trim();

  if (slug === 'new-arrivals' || name.toLowerCase() === 'new arrivals') {
    return '/#shop';
  }

  if (
    slug === 'bestsellers' ||
    slug === 'most-loved' ||
    name.toLowerCase() === 'bestsellers' ||
    name.toLowerCase() === 'most loved'
  ) {
    return '/#most-loved';
  }

  if (name) {
    return `/?category=${encodeURIComponent(name)}#category-products-anchor`;
  }

  if (slug) {
    return `/?category=${encodeURIComponent(slug)}#category-products-anchor`;
  }

  return '/#categories';
}
