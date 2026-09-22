import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  AllContentData,
  AnnouncementBarContent,
  HeroContent,
  AboutContent,
  SeoContent,
  PromotionalBanner,
  CreateBannerInput,
  UpdateBannerInput,
  FeaturedCollectionItem,
  FeaturedProductItem,
  SiteContentSectionKey,
} from '@/types/content';
import { STORAGE_BUCKET, validateImageFile, getPublicImageUrl } from '@/lib/product-images';

// Canonical fallback data matching the existing storefront 1:1
export const DEFAULT_ANNOUNCEMENT: AnnouncementBarContent = {
  enabled: true,
  message: 'Complimentary bespoke luxury packaging on all heirloom orders across India',
  ctaText: 'Explore Collection',
  ctaLink: '/#categories',
  startDate: null,
  endDate: null,
};

export const DEFAULT_HERO: HeroContent = {
  heading: 'Made by Hand.\nMeant to Be Loved.',
  subheading:
    'Step into the serene universe of VELORA. Thoughtfully handcrafted crochet pieces designed to bring warmth, character, and tactile magic into everyday life.',
  ctaText: 'Explore Collection',
  ctaLink: '#categories',
  secondaryCtaText: 'Our Story',
  secondaryCtaLink: '#about',
  backgroundMedia: '/videos/velora-hero.mp4',
  enabled: true,
};

export const DEFAULT_ABOUT: AboutContent = {
  brandHeading: 'The Story Behind VELORA',
  description:
    'Founded on the unwavering belief that handmade goods possess a soul that automated machines can never replicate, VELORA bridges traditional crochet heritage with sleek modern luxury aesthetics.',
  storyContent:
    'From hand-selecting 100% natural organic cotton yarn to spending over 12 hours perfecting a single tapestry, our artisan workshop infuses warmth, elegance, and intentionality into every stitch.',
  image: '/images/story/story-main.png',
  ctaText: 'Discover Atelier',
  ctaLink: '#collections',
  stats: [
    { label: 'Handmade', value: '100%' },
    { label: 'Hours / Piece', value: '12+' },
    { label: 'Plastic Waste', value: 'Zero' },
  ],
  enabled: true,
};

export const DEFAULT_SEO: SeoContent = {
  homepageTitle: 'VELORA | Luxury Handcrafted Crochet Brand',
  metaDescription:
    'VELORA — Premium handcrafted crochet brand. Handcrafted elegance, bespoke artisan accessories, luxury home decor, and custom handmade creations.',
  ogImage: '/images/og/velora-og.jpg',
  canonicalUrl: 'https://cjvelora.vercel.app',
  keywords:
    'luxury crochet, handmade crochet brand, crochet bags, crochet home decor, amigurumi, organic cotton yarn, bespoke crochet, VELORA',
};

export const DEFAULT_BANNERS: PromotionalBanner[] = [
  {
    id: 'default-banner-1',
    title: 'The Monsoon Heirloom Drop',
    description:
      'Artisan handcrafted crochet bags woven with reinforced double-loop knots and organic botanical yarn.',
    imageUrl: '/images/story/story-secondary.jpg',
    ctaText: 'Explore Collection',
    ctaLink: '/#categories',
    badge: 'Limited Atelier Edition',
    discountType: 'percentage',
    discountValue: 10,
    collectionId: 'crochet-bags',
    collectionName: 'Crochet Bags',
    collectionSlug: 'crochet-bags',
    active: true,
    displayOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Retrieves client-side JWT authorization headers for admin requests.
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined' && isSupabaseConfigured) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    } catch {
      // Ignore session retrieval issues in restricted browser modes
    }
  }
  return headers;
}

// -----------------------------------------------------------------------------
// Public Storefront Fetchers (With Resilient Fallbacks)
// -----------------------------------------------------------------------------

/**
 * Loads published storefront content. Never throws, always returns sensible defaults.
 */
export async function getStorefrontContent(): Promise<AllContentData> {
  const result: AllContentData = {
    announcementBar: { ...DEFAULT_ANNOUNCEMENT },
    hero: { ...DEFAULT_HERO },
    banners: [...DEFAULT_BANNERS],
    featuredCollections: [],
    featuredProducts: [],
    about: { ...DEFAULT_ABOUT },
    seo: { ...DEFAULT_SEO },
  };

  if (!isSupabaseConfigured) return result;

  try {
    // 1. Fetch site_content sections in parallel
    const [siteContentRes, bannersRes, featCollectionsRes, featProductsRes] = await Promise.all([
      supabase.from('site_content').select('section, content, active'),
      supabase
        .from('promotional_banners')
        .select('*')
        .eq('active', true)
        .order('display_order', { ascending: true }),
      supabase
        .from('featured_collections')
        .select('*, categories(name, slug, image_url, description)')
        .eq('active', true)
        .order('display_order', { ascending: true }),
      supabase
        .from('featured_products')
        .select('*, products(*)')
        .eq('active', true)
        .order('display_order', { ascending: true }),
    ]);

    if (!siteContentRes.error && siteContentRes.data) {
      for (const row of siteContentRes.data) {
        if (!row.active) continue;
        if (row.section === 'announcement_bar' && row.content) {
          result.announcementBar = { ...DEFAULT_ANNOUNCEMENT, ...row.content };
        } else if (row.section === 'hero' && row.content) {
          result.hero = { ...DEFAULT_HERO, ...row.content };
        } else if (row.section === 'about' && row.content) {
          result.about = { ...DEFAULT_ABOUT, ...row.content };
        } else if (row.section === 'seo' && row.content) {
          result.seo = { ...DEFAULT_SEO, ...row.content };
        }
      }
    }

    if (!bannersRes.error && bannersRes.data && bannersRes.data.length > 0) {
      result.banners = bannersRes.data.map((b: any) => ({
        id: b.id,
        title: b.title,
        description: b.description || '',
        imageUrl: b.image_url || '',
        ctaText: b.cta_text || 'Explore Collection',
        ctaLink: b.cta_link || '',
        badge: b.badge || 'Limited Atelier Edition',
        discountType: (b.discount_type as any) || 'percentage',
        discountValue: Number(b.discount_value ?? 0),
        collectionId: b.collection_id || null,
        collectionName: b.collection_name || null,
        collectionSlug: b.collection_slug || null,
        active: Boolean(b.active),
        displayOrder: Number(b.display_order ?? 0),
        startDate: b.start_date || null,
        endDate: b.end_date || null,
        createdAt: b.created_at,
        updatedAt: b.updated_at,
      }));
    }

    if (!featCollectionsRes.error && featCollectionsRes.data) {
      result.featuredCollections = featCollectionsRes.data.map((c: any) => ({
        id: c.id,
        categoryId: c.category_id,
        title: c.title || c.categories?.name || '',
        description: c.description || c.categories?.description || '',
        imageUrl: c.image_url || c.categories?.image_url || '',
        displayOrder: Number(c.display_order ?? 0),
        active: Boolean(c.active),
        categorySlug: c.categories?.slug || '',
      }));
    }

    if (!featProductsRes.error && featProductsRes.data) {
      result.featuredProducts = featProductsRes.data.map((p: any) => ({
        id: p.id,
        productId: p.product_id,
        displayOrder: Number(p.display_order ?? 0),
        active: Boolean(p.active),
        product: p.products,
      }));
    }
  } catch (err) {
    console.warn('Error fetching storefront content (using fallback defaults):', err);
  }

  return result;
}

// -----------------------------------------------------------------------------
// Admin Content API Fetchers & Mutators
// -----------------------------------------------------------------------------

export async function getAdminContent(): Promise<AllContentData> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/admin/content', {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || `Failed to fetch admin content (${res.status})`);
    }

    return data.content as AllContentData;
  } catch (err: any) {
    console.error('Error in getAdminContent:', err);
    throw err;
  }
}

export async function saveSiteContentSection(
  section: SiteContentSectionKey,
  content: any,
  active = true
): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/admin/content', {
      method: 'PUT',
      headers,
      body: JSON.stringify({ section, content, active }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || `Failed to save ${section} section`);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error saving content section.' };
  }
}

export async function createPromotionalBanner(
  input: CreateBannerInput
): Promise<{ success: boolean; banner?: PromotionalBanner; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/admin/content/banners', {
      method: 'POST',
      headers,
      body: JSON.stringify(input),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to create banner.');
    }

    return { success: true, banner: data.banner };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error creating banner.' };
  }
}

export async function updatePromotionalBanner(
  bannerId: string,
  input: UpdateBannerInput
): Promise<{ success: boolean; banner?: PromotionalBanner; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/admin/content/banners/${bannerId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(input),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update banner.');
    }

    return { success: true, banner: data.banner };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error updating banner.' };
  }
}

export async function deletePromotionalBanner(
  bannerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/admin/content/banners/${bannerId}`, {
      method: 'DELETE',
      headers,
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to delete banner.');
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error deleting banner.' };
  }
}

export async function saveFeaturedCollections(
  items: { categoryId: string; displayOrder: number; active: boolean; title?: string; description?: string }[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/admin/content/featured-collections', {
      method: 'PUT',
      headers,
      body: JSON.stringify({ items }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update featured collections.');
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error saving featured collections.' };
  }
}

export async function saveFeaturedProducts(
  items: { productId: string; displayOrder: number; active: boolean }[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/admin/content/featured-products', {
      method: 'PUT',
      headers,
      body: JSON.stringify({ items }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update featured products.');
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error saving featured products.' };
  }
}

/**
 * Uploads an image for content management (banners, about story) to Supabase Storage.
 */
export async function uploadContentImage(
  file: File,
  folder = 'content'
): Promise<{ publicUrl: string | null; error: string | null }> {
  try {
    if (!isSupabaseConfigured) {
      return { publicUrl: null, error: 'Storage service is not configured.' };
    }

    const validation = validateImageFile(file);
    if (!validation.valid) {
      return { publicUrl: null, error: validation.error || 'Invalid file.' };
    }

    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const sanitizedFileName = file.name
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, '-')
      .replace(/-+/g, '-');
    const storagePath = `${folder}/${timestamp}_${randomSuffix}_${sanitizedFileName}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      return { publicUrl: null, error: `Upload failed: ${uploadError.message}` };
    }

    const publicUrl = getPublicImageUrl(storagePath);
    return { publicUrl, error: null };
  } catch (err: any) {
    return { publicUrl: null, error: err?.message || 'Unexpected error uploading image.' };
  }
}
