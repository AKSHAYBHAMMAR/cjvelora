-- ==============================================================================
-- VELORA / CJVELORA — Idempotent Admin Content Management Migration
-- ==============================================================================
-- Creates structured tables for Content Management:
--   1. public.site_content (structured singleton section records: announcement_bar, hero, about, seo)
--   2. public.promotional_banners (promotional campaign banners with images and scheduling)
--   3. public.featured_collections (curated category highlights referencing categories table)
--   4. public.featured_products (curated product highlights referencing products table)
--
-- Security:
--   - SELECT: Public (anon and authenticated) can read active content.
--   - INSERT/UPDATE/DELETE: Restricted to authenticated admins in public.admin_roles.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SITE CONTENT TABLE (Sections: announcement_bar, hero, about, seo)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_content (
  section text PRIMARY KEY,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Seed default site content mirroring exact current storefront design
INSERT INTO public.site_content (section, content, active)
VALUES
  (
    'announcement_bar',
    '{
      "enabled": true,
      "message": "Complimentary bespoke luxury packaging on all heirloom orders across India",
      "ctaText": "Explore Collection",
      "ctaLink": "/#categories",
      "startDate": null,
      "endDate": null
    }'::jsonb,
    true
  ),
  (
    'hero',
    '{
      "heading": "Made by Hand.\nMeant to Be Loved.",
      "subheading": "Step into the serene universe of VELORA. Thoughtfully handcrafted crochet pieces designed to bring warmth, character, and tactile magic into everyday life.",
      "ctaText": "Explore Collection",
      "ctaLink": "#categories",
      "secondaryCtaText": "Our Story",
      "secondaryCtaLink": "#about",
      "backgroundMedia": "/videos/velora-hero.mp4",
      "enabled": true
    }'::jsonb,
    true
  ),
  (
    'about',
    '{
      "brandHeading": "The Story Behind VELORA",
      "description": "Founded on the unwavering belief that handmade goods possess a soul that automated machines can never replicate, VELORA bridges traditional crochet heritage with sleek modern luxury aesthetics.",
      "storyContent": "From hand-selecting 100% natural organic cotton yarn to spending over 12 hours perfecting a single tapestry, our artisan workshop infuses warmth, elegance, and intentionality into every stitch.",
      "image": "/images/story/story-main.png",
      "ctaText": "Discover Atelier",
      "ctaLink": "#collections",
      "stats": [
        { "label": "Handmade", "value": "100%" },
        { "label": "Hours / Piece", "value": "12+" },
        { "label": "Plastic Waste", "value": "Zero" }
      ],
      "enabled": true
    }'::jsonb,
    true
  ),
  (
    'seo',
    '{
      "homepageTitle": "VELORA | Luxury Handcrafted Crochet Brand",
      "metaDescription": "VELORA — Premium handcrafted crochet brand. Handcrafted elegance, bespoke artisan accessories, luxury home decor, and custom handmade creations.",
      "ogImage": "/images/og/velora-og.jpg",
      "canonicalUrl": "https://cjvelora.vercel.app",
      "keywords": "luxury crochet, handmade crochet brand, crochet bags, crochet home decor, amigurumi, organic cotton yarn, bespoke crochet, VELORA"
    }'::jsonb,
    true
  )
ON CONFLICT (section) DO NOTHING;


-- ------------------------------------------------------------------------------
-- 2. PROMOTIONAL BANNERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.promotional_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  image_url text,
  cta_text text,
  cta_link text,
  active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_promo_banners_active_order 
  ON public.promotional_banners(active, display_order);

-- Seed initial promotional campaign
INSERT INTO public.promotional_banners (
  title,
  description,
  image_url,
  cta_text,
  cta_link,
  active,
  display_order
)
SELECT
  'The Monsoon Heirloom Drop',
  'Artisan handcrafted crochet bags woven with reinforced double-loop knots and organic botanical yarn.',
  '/images/story/story-secondary.jpg',
  'Shop New Arrivals',
  '/#categories',
  true,
  1
WHERE NOT EXISTS (SELECT 1 FROM public.promotional_banners LIMIT 1);


-- ------------------------------------------------------------------------------
-- 3. FEATURED COLLECTIONS TABLE (References existing categories)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.featured_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  title text,
  description text,
  image_url text,
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feat_collections_active_order 
  ON public.featured_collections(active, display_order);

-- Seed default featured collections linked to existing categories if available
INSERT INTO public.featured_collections (category_id, title, description, display_order, active)
SELECT 
  id, 
  name, 
  description, 
  display_order, 
  is_active
FROM public.categories
WHERE is_active = true
LIMIT 4
ON CONFLICT DO NOTHING;


-- ------------------------------------------------------------------------------
-- 4. FEATURED PRODUCTS TABLE (References existing products)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.featured_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feat_products_active_order 
  ON public.featured_products(active, display_order);

-- Seed default featured products from best sellers / most loved
INSERT INTO public.featured_products (product_id, display_order, active)
SELECT 
  id, 
  ROW_NUMBER() OVER (ORDER BY created_at DESC), 
  true
FROM public.products
WHERE is_published = true AND (is_best_seller = true OR badge IS NOT NULL)
LIMIT 6
ON CONFLICT DO NOTHING;


-- ------------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotional_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured_products ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- 5a. site_content policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'site_content' AND policyname = 'Allow public select on site_content') THEN
    CREATE POLICY "Allow public select on site_content"
      ON public.site_content
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'site_content' AND policyname = 'Allow admins full manage site_content') THEN
    CREATE POLICY "Allow admins full manage site_content"
      ON public.site_content
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.admin_roles
          WHERE user_id = auth.uid()
            AND role IN ('super_admin', 'staff')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.admin_roles
          WHERE user_id = auth.uid()
            AND role IN ('super_admin', 'staff')
        )
      );
  END IF;

  -- 5b. promotional_banners policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'promotional_banners' AND policyname = 'Allow public select on active promotional_banners') THEN
    CREATE POLICY "Allow public select on active promotional_banners"
      ON public.promotional_banners
      FOR SELECT
      TO anon, authenticated
      USING (active = true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'promotional_banners' AND policyname = 'Allow admins full manage promotional_banners') THEN
    CREATE POLICY "Allow admins full manage promotional_banners"
      ON public.promotional_banners
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.admin_roles
          WHERE user_id = auth.uid()
            AND role IN ('super_admin', 'staff')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.admin_roles
          WHERE user_id = auth.uid()
            AND role IN ('super_admin', 'staff')
        )
      );
  END IF;

  -- 5c. featured_collections policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'featured_collections' AND policyname = 'Allow public select on active featured_collections') THEN
    CREATE POLICY "Allow public select on active featured_collections"
      ON public.featured_collections
      FOR SELECT
      TO anon, authenticated
      USING (active = true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'featured_collections' AND policyname = 'Allow admins full manage featured_collections') THEN
    CREATE POLICY "Allow admins full manage featured_collections"
      ON public.featured_collections
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.admin_roles
          WHERE user_id = auth.uid()
            AND role IN ('super_admin', 'staff')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.admin_roles
          WHERE user_id = auth.uid()
            AND role IN ('super_admin', 'staff')
        )
      );
  END IF;

  -- 5d. featured_products policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'featured_products' AND policyname = 'Allow public select on active featured_products') THEN
    CREATE POLICY "Allow public select on active featured_products"
      ON public.featured_products
      FOR SELECT
      TO anon, authenticated
      USING (active = true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'featured_products' AND policyname = 'Allow admins full manage featured_products') THEN
    CREATE POLICY "Allow admins full manage featured_products"
      ON public.featured_products
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.admin_roles
          WHERE user_id = auth.uid()
            AND role IN ('super_admin', 'staff')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.admin_roles
          WHERE user_id = auth.uid()
            AND role IN ('super_admin', 'staff')
        )
      );
  END IF;
END $$;
