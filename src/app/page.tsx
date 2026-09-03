import Hero from '@/components/home/Hero';
import ProductSection from '@/components/products/ProductSection';
import AtelierStory from '@/components/home/AtelierStory';
import WhyChooseUs from '@/components/home/WhyChooseUs';
import CraftProcess from '@/components/home/CraftProcess';
import Testimonials from '@/components/home/Testimonials';
import FAQSection from '@/components/home/FAQSection';
import ContactSection from '@/components/home/ContactSection';

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* 1. Hero Section with Video Canvas (Preserved Exactly) */}
      <Hero
        videoSrc="/videos/velora-hero.mp4"
      />

      {/* Stitched Seam Divider */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 my-4">
        <div className="stitched-divider" />
      </div>

      {/* 2. PRODUCT SECTION: Shop by Category & Most Loved by You ❤️ */}
      <ProductSection />

      {/* Stitched Seam Divider */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 my-6">
        <div className="stitched-divider" />
      </div>

      {/* 3. Atelier Story & Bento Grid */}
      <AtelierStory />

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
