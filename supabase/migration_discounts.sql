-- ==============================================================================
-- VELORA / CJVELORA — Discounts & Promotions Table Schema & Migration
-- ==============================================================================
-- Safe, additive, and idempotent migration for Discounts & Promotions:
--   1. Ensures public.discounts table exists with full constraints.
--   2. Ensures public.discount_usages table exists for per-customer tracking.
--   3. Idempotently adds discount_code and discount_id to public.orders.
--   4. Creates atomic RPC record_discount_usage.
--   5. Configures Row Level Security (RLS).
-- ==============================================================================

-- 1. DISCOUNTS TABLE
CREATE TABLE IF NOT EXISTS public.discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percentage',
  discount_value NUMERIC(12, 2) NOT NULL,
  minimum_order_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  maximum_discount_amount NUMERIC(12, 2) NULL,
  start_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_at TIMESTAMPTZ NULL,
  usage_limit INTEGER NULL,
  usage_count INTEGER NOT NULL DEFAULT 0,
  per_customer_limit INTEGER NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotent column check for discounts table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='discounts' AND column_name='code') THEN
    ALTER TABLE public.discounts ADD COLUMN code TEXT NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='discounts' AND column_name='description') THEN
    ALTER TABLE public.discounts ADD COLUMN description TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='discounts' AND column_name='discount_type') THEN
    ALTER TABLE public.discounts ADD COLUMN discount_type TEXT NOT NULL DEFAULT 'percentage';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='discounts' AND column_name='discount_value') THEN
    ALTER TABLE public.discounts ADD COLUMN discount_value NUMERIC(12, 2) NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='discounts' AND column_name='minimum_order_amount') THEN
    ALTER TABLE public.discounts ADD COLUMN minimum_order_amount NUMERIC(12, 2) NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='discounts' AND column_name='maximum_discount_amount') THEN
    ALTER TABLE public.discounts ADD COLUMN maximum_discount_amount NUMERIC(12, 2) NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='discounts' AND column_name='start_at') THEN
    ALTER TABLE public.discounts ADD COLUMN start_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='discounts' AND column_name='end_at') THEN
    ALTER TABLE public.discounts ADD COLUMN end_at TIMESTAMPTZ NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='discounts' AND column_name='usage_limit') THEN
    ALTER TABLE public.discounts ADD COLUMN usage_limit INTEGER NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='discounts' AND column_name='usage_count') THEN
    ALTER TABLE public.discounts ADD COLUMN usage_count INTEGER NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='discounts' AND column_name='per_customer_limit') THEN
    ALTER TABLE public.discounts ADD COLUMN per_customer_limit INTEGER NULL DEFAULT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='discounts' AND column_name='active') THEN
    ALTER TABLE public.discounts ADD COLUMN active BOOLEAN NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='discounts' AND column_name='created_at') THEN
    ALTER TABLE public.discounts ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='discounts' AND column_name='updated_at') THEN
    ALTER TABLE public.discounts ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- Enforce unique index on uppercase code
CREATE UNIQUE INDEX IF NOT EXISTS discounts_code_upper_unique_idx ON public.discounts (UPPER(code));
CREATE INDEX IF NOT EXISTS discounts_active_dates_idx ON public.discounts (active, start_at, end_at);

-- Constraints
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'discounts_type_check') THEN
    ALTER TABLE public.discounts ADD CONSTRAINT discounts_type_check CHECK (discount_type IN ('percentage', 'fixed_amount'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'discounts_value_check') THEN
    ALTER TABLE public.discounts ADD CONSTRAINT discounts_value_check CHECK (discount_value > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'discounts_percentage_check') THEN
    ALTER TABLE public.discounts ADD CONSTRAINT discounts_percentage_check CHECK (discount_type != 'percentage' OR discount_value <= 100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'discounts_dates_check') THEN
    ALTER TABLE public.discounts ADD CONSTRAINT discounts_dates_check CHECK (end_at IS NULL OR end_at >= start_at);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'discounts_min_order_check') THEN
    ALTER TABLE public.discounts ADD CONSTRAINT discounts_min_order_check CHECK (minimum_order_amount >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'discounts_usage_limit_check') THEN
    ALTER TABLE public.discounts ADD CONSTRAINT discounts_usage_limit_check CHECK (usage_limit IS NULL OR usage_limit >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'discounts_usage_count_check') THEN
    ALTER TABLE public.discounts ADD CONSTRAINT discounts_usage_count_check CHECK (usage_count >= 0);
  END IF;
END $$;

-- 2. DISCOUNT USAGES TABLE (audit log & per-customer enforcement)
CREATE TABLE IF NOT EXISTS public.discount_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_id UUID NOT NULL REFERENCES public.discounts(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_id UUID NULL,
  customer_email TEXT NOT NULL,
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS discount_usages_discount_email_idx ON public.discount_usages (discount_id, LOWER(customer_email));
CREATE INDEX IF NOT EXISTS discount_usages_order_id_idx ON public.discount_usages (order_id);

-- 3. ORDERS TABLE COLUMNS (Additive)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='discount_code') THEN
    ALTER TABLE public.orders ADD COLUMN discount_code TEXT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='discount_id') THEN
    ALTER TABLE public.orders ADD COLUMN discount_id UUID NULL REFERENCES public.discounts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. ATOMIC RPC FUNCTION TO RECORD USAGE SAFELY
CREATE OR REPLACE FUNCTION public.record_discount_usage(
  p_discount_id UUID,
  p_order_id UUID,
  p_customer_id UUID,
  p_customer_email TEXT,
  p_discount_amount NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  -- Atomically increment usage_count ensuring usage_limit is not exceeded
  UPDATE public.discounts
  SET usage_count = usage_count + 1,
      updated_at = NOW()
  WHERE id = p_discount_id
    AND active = true
    AND (usage_limit IS NULL OR usage_count < usage_limit);

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RETURN FALSE;
  END IF;

  -- Insert audit usage record
  INSERT INTO public.discount_usages (
    discount_id,
    order_id,
    customer_id,
    customer_email,
    discount_amount
  ) VALUES (
    p_discount_id,
    p_order_id,
    p_customer_id,
    LOWER(TRIM(p_customer_email)),
    p_discount_amount
  );

  RETURN TRUE;
END;
$$;

-- 5. ROW LEVEL SECURITY
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_usages ENABLE ROW LEVEL SECURITY;

-- Discounts policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'discounts' AND policyname = 'Allow public read active discounts') THEN
    CREATE POLICY "Allow public read active discounts"
      ON public.discounts
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'discounts' AND policyname = 'Allow admins full manage discounts') THEN
    CREATE POLICY "Allow admins full manage discounts"
      ON public.discounts
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

-- Discount usages policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'discount_usages' AND policyname = 'Allow authenticated users read their usages') THEN
    CREATE POLICY "Allow authenticated users read their usages"
      ON public.discount_usages
      FOR SELECT
      TO authenticated
      USING (customer_id = auth.uid() OR customer_email = auth.jwt()->>'email');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'discount_usages' AND policyname = 'Allow admins full manage usages') THEN
    CREATE POLICY "Allow admins full manage usages"
      ON public.discount_usages
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.admin_roles
          WHERE user_id = auth.uid()
            AND role IN ('super_admin', 'staff')
        )
      );
  END IF;
END $$;
