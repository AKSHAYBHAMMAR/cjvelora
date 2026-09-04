-- ==============================================================================
-- CJVELORA — Supabase Categories Seed Script
-- ==============================================================================
-- Seeds the 6 existing handcrafted categories into the Supabase 'categories' table.
-- Preserves existing names, slugs, subtitles, descriptions, item counts,
-- and local public image paths (/images/categories/...).
-- ==============================================================================

-- If your table uses UUID for 'id' with default gen_random_uuid(), omitting 'id' ensures seamless insertion:
INSERT INTO public.categories (name, slug, subtitle, description, image_url, item_count)
VALUES
  (
    'Crochet Bags',
    'crochet-bags',
    'Artisan Carryalls & Totes',
    'Artisan Carryalls & Totes',
    '/images/categories/crochet-bags.jpg',
    4
  ),
  (
    'Crochet Toys',
    'crochet-toys',
    'Heirloom Amigurumi Plush',
    'Heirloom Amigurumi Plush',
    '/images/categories/crochet-toys.jpg',
    4
  ),
  (
    'Crochet Kitchens',
    'crochet-kitchens',
    'Waffle Trivets & Dishcloths',
    'Waffle Trivets & Dishcloths',
    '/images/categories/crochet-kitchens.jpg',
    3
  ),
  (
    'Crochet Gifts',
    'crochet-gifts',
    'Floral Bouquets & Keepsakes',
    'Floral Bouquets & Keepsakes',
    '/images/categories/crochet-gifts.jpg',
    4
  ),
  (
    'Dream Catchers',
    'dream-catchers',
    'Sacred Yarn Webs & Tassels',
    'Sacred Yarn Webs & Tassels',
    '/images/categories/dream-catchers.jpg',
    3
  ),
  (
    'Table Mats',
    'table-mats',
    'Lace Placemats & Runners',
    'Lace Placemats & Runners',
    '/images/categories/table-mats.jpg',
    3
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  subtitle = EXCLUDED.subtitle,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  item_count = EXCLUDED.item_count;

-- Ensure RLS allows public SELECT on categories:
ALTER TABLE IF EXISTS public.categories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'Allow public read access to categories'
  ) THEN
    CREATE POLICY "Allow public read access to categories"
      ON public.categories
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;
