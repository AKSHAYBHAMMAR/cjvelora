-- ==============================================================================
-- VELORA / CJVELORA — Categories Table Schema & Migration
-- ==============================================================================
-- Safe, additive, and idempotent migration for Category Management:
--   1. Ensures public.categories table exists with standard schema.
--   2. Adds any potentially missing columns idempotently.
--   3. Adds a unique index on slug.
--   4. Hardens Row Level Security (RLS) for categories.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT DEFAULT '/images/categories/crochet-bags.jpg',
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotently ensure all expected columns exist if the table was created earlier with fewer fields
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categories' AND column_name='name') THEN
    ALTER TABLE public.categories ADD COLUMN name TEXT NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categories' AND column_name='slug') THEN
    ALTER TABLE public.categories ADD COLUMN slug TEXT NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categories' AND column_name='description') THEN
    ALTER TABLE public.categories ADD COLUMN description TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categories' AND column_name='image_url') THEN
    ALTER TABLE public.categories ADD COLUMN image_url TEXT DEFAULT '/images/categories/crochet-bags.jpg';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categories' AND column_name='is_active') THEN
    ALTER TABLE public.categories ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categories' AND column_name='display_order') THEN
    ALTER TABLE public.categories ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categories' AND column_name='created_at') THEN
    ALTER TABLE public.categories ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categories' AND column_name='updated_at') THEN
    ALTER TABLE public.categories ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- Enforce unique index on slug if not already present
CREATE UNIQUE INDEX IF NOT EXISTS categories_slug_unique_idx ON public.categories (slug);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 1. Public can read categories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
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

-- 2. Authenticated admins can manage categories (INSERT, UPDATE, DELETE)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'categories'
      AND policyname = 'Allow admins to manage categories'
  ) THEN
    CREATE POLICY "Allow admins to manage categories"
      ON public.categories
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
