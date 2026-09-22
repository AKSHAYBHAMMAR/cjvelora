-- ==============================================================================
-- VELORA / CJVELORA — Dynamic Promotional Offer System Migration
-- ==============================================================================
-- Idempotently extends public.promotional_banners to support:
--   1. Offer discount configuration (percentage discount_value)
--   2. Collection / category target scope (collection_id, collection_name, collection_slug)
--   3. Atelier badge text
-- ==============================================================================

DO $$
BEGIN
  -- 1. Badge text (e.g. 'LIMITED ATELIER EDITION')
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='promotional_banners' AND column_name='badge') THEN
    ALTER TABLE public.promotional_banners ADD COLUMN badge TEXT DEFAULT 'Limited Atelier Edition';
  END IF;

  -- 2. Discount Type (defaults to 'percentage')
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='promotional_banners' AND column_name='discount_type') THEN
    ALTER TABLE public.promotional_banners ADD COLUMN discount_type TEXT DEFAULT 'percentage';
  END IF;

  -- 3. Discount Value (e.g. 10 for 10% OFF)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='promotional_banners' AND column_name='discount_value') THEN
    ALTER TABLE public.promotional_banners ADD COLUMN discount_value NUMERIC(5, 2) DEFAULT 0;
  END IF;

  -- 4. Target Collection ID (e.g. category UUID or standard slug 'new-arrivals')
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='promotional_banners' AND column_name='collection_id') THEN
    ALTER TABLE public.promotional_banners ADD COLUMN collection_id TEXT NULL;
  END IF;

  -- 5. Target Collection Display Name (e.g. 'New Arrivals', 'Crochet Bags')
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='promotional_banners' AND column_name='collection_name') THEN
    ALTER TABLE public.promotional_banners ADD COLUMN collection_name TEXT NULL;
  END IF;

  -- 6. Target Collection URL Slug (e.g. 'new-arrivals', 'crochet-bags')
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='promotional_banners' AND column_name='collection_slug') THEN
    ALTER TABLE public.promotional_banners ADD COLUMN collection_slug TEXT NULL;
  END IF;
END $$;
