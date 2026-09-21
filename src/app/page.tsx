import type { Metadata } from 'next';
import Hero from '@/components/home/Hero';
import ProductSection from '@/components/products/ProductSection';
import AtelierStory from '@/components/home/AtelierStory';
import WhyChooseUs from '@/components/home/WhyChooseUs';
import CraftProcess from '@/components/home/CraftProcess';
import Testimonials from '@/components/home/Testimonials';
import FAQSection from '@/components/home/FAQSection';
import ContactSection from '@/components/home/ContactSection';
import PromotionalBannerSection from '@/components/home/PromotionalBannerSection';
import { getStorefrontContent } from '@/lib/content';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const content = await getStorefrontContent();
    const seo = content.seo;
    return {
      title: seo.homepageTitle || 'VELORA | Luxury Handcrafted Crochet Brand',
      description: seo.metaDescription || 'VELORA — Premium handcrafted crochet brand.',
      openGraph: {
        title: seo.homepageTitle || 'VELORA | Luxury Handcrafted Crochet Brand',
        description: seo.metaDescription || 'Made by Hand. Meant to Be Loved.',
        images: seo.ogImage ? [{ url: seo.ogImage }] : undefined,
      },
    };
  } catch {
    return {
      title: 'VELORA | Luxury Handcrafted Crochet Brand',
      description: 'VELORA — Premium handcrafted crochet brand.',
    };
  }
}

export default async function HomePage() {
  const content = await getStorefrontContent();

  return (
    <main className="min-h-screen">
      {/* 1. Hero Section with Video Canvas (Preserved Exactly) */}
      <Hero
        videoSrc="/videos/velora-hero.mp4"
        content={content.hero}
      />

      {/* Stitched Seam Divider */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 my-4">
        <div className="stitched-divider" />
      </div>

      {/* 2. PRODUCT SECTION: Shop by Category & Most Loved by You ❤️ */}
      <ProductSection />

      {/* Active Promotional Banners (if configured in CMS) */}
      {content.banners && content.banners.length > 0 && (
        <PromotionalBannerSection banners={content.banners} />
      )}

      {/* Stitched Seam Divider */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 my-6">
        <div className="stitched-divider" />
      </div>

      {/* 3. Atelier Story & Bento Grid */}
      <AtelierStory content={content.about} />

      {/* Stitched Seam Divider */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 my-4">
        <div className="stitched-divider" />
      </div>

      {/* 4. Why Choose VELORA */}
      <WhyChooseUs />

      {/* 5. Step-by-Step Craft Process */}
      <CraftProcess />

      {/* 6. Client Reviews & Testimonials */}
      <Testimonials />

      {/* Stitched Seam Divider */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 my-4">
        <div className="stitched-divider" />
      </div>

      {/* 7. Frequently Asked Questions */}
      <FAQSection />

      {/* 8. Atelier Contact Concierge */}
      <ContactSection />
    </main>
  );
}
