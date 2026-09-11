-- ==============================================================================
-- VELORA — Categories Seed
-- ==============================================================================

INSERT INTO public.categories
  (name, slug, description, image_url, is_active, display_order)
VALUES
  (
    'Crochet Bags',
    'crochet-bags',
    'Artisan Carryalls & Totes',
    '/images/categories/crochet-bags.jpg',
    true,
    1
  ),
  (
    'Crochet Toys',
    'crochet-toys',
    'Heirloom Amigurumi Plush',
    '/images/categories/crochet-toys.jpg',
    true,
    2
  ),
  (
    'Crochet Kitchens',
    'crochet-kitchens',
    'Waffle Trivets & Dishcloths',
    '/images/categories/crochet-kitchens.jpg',
    true,
    3
  ),
  (
    'Crochet Gifts',
    'crochet-gifts',
    'Floral Bouquets & Keepsakes',
    '/images/categories/crochet-gifts.jpg',
    true,
    4
  ),
  (
    'Dream Catchers',
    'dream-catchers',
    'Sacred Yarn Webs & Tassels',
    '/images/categories/dream-catchers.jpg',
    true,
    5
  ),
  (
    'Table Mats',
    'table-mats',
    'Lace Placemats & Runners',
    '/images/categories/table-mats.jpg',
    true,
    6
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  is_active = EXCLUDED.is_active,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- Ensure public read access
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'categories'
      AND policyname = 'Allow public read access to categories'
  ) THEN
    CREATE POLICY "Allow public read access to categories"
      ON public.categories
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;