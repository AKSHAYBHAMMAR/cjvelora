import { Product } from './index';

export interface AnnouncementBarContent {
  enabled: boolean;
  message: string;
  ctaText?: string;
  ctaLink?: string;
  startDate?: string | null;
  endDate?: string | null;
}

export interface HeroContent {
  heading: string;
  subheading: string;
  ctaText: string;
  ctaLink: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  backgroundMedia: string;
  enabled: boolean;
}

export interface AboutStat {
  label: string;
  value: string;
}

export interface AboutContent {
  brandHeading: string;
  description: string;
  storyContent: string;
  image: string;
  ctaText?: string;
  ctaLink?: string;
  stats: AboutStat[];
  enabled: boolean;
}

export interface SeoContent {
  homepageTitle: string;
  metaDescription: string;
  ogImage?: string;
  canonicalUrl?: string;
  keywords?: string;
}

export interface PromotionalBanner {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  ctaText?: string;
  ctaLink?: string;
  active: boolean;
  displayOrder: number;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBannerInput {
  title: string;
  description?: string;
  imageUrl?: string;
  ctaText?: string;
  ctaLink?: string;
  active?: boolean;
  displayOrder?: number;
  startDate?: string | null;
  endDate?: string | null;
}

export interface UpdateBannerInput {
  title?: string;
  description?: string;
  imageUrl?: string;
  ctaText?: string;
  ctaLink?: string;
  active?: boolean;
  displayOrder?: number;
  startDate?: string | null;
  endDate?: string | null;
}

export interface FeaturedCollectionItem {
  id: string;
  categoryId: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  displayOrder: number;
  active: boolean;
  categorySlug?: string;
  productCount?: number;
}

export interface FeaturedProductItem {
  id: string;
  productId: string;
  displayOrder: number;
  active: boolean;
  product?: Product;
}

export interface AllContentData {
  announcementBar: AnnouncementBarContent;
  hero: HeroContent;
  banners: PromotionalBanner[];
  featuredCollections: FeaturedCollectionItem[];
  featuredProducts: FeaturedProductItem[];
  about: AboutContent;
  seo: SeoContent;
}

export type SiteContentSectionKey = 'announcement_bar' | 'hero' | 'about' | 'seo';
