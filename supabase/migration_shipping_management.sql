-- ==============================================================================
-- CJVELORA — DATABASE MIGRATION: SHIPPING MANAGEMENT & TRACKING
-- ==============================================================================
-- This migration is completely safe, idempotent, and additive:
--   1. Adds shipping and logistics tracking columns to public.orders.
--   2. Adds performance index on shipping_tracking_number.
--   3. Preserves all existing columns, constraints, RLS policies, and RPCs.
--   4. Does not alter payment verification, inventory, checkout, or auth tables.
-- ==============================================================================

DO $$
BEGIN
  -- 1. Shipping Provider / Courier (e.g. Delhivery, BlueDart, DTDC, India Post, FedEx)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'shipping_provider'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN shipping_provider text;
  END IF;

  -- 2. Shipping Tracking Number / AWB
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'shipping_tracking_number'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN shipping_tracking_number text;
  END IF;

  -- 3. Shipping Tracking Webpage URL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'shipping_tracking_url'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN shipping_tracking_url text;
  END IF;

  -- 4. Authoritative Dispatch Timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'shipping_dispatched_at'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN shipping_dispatched_at timestamptz;
  END IF;

  -- 5. Estimated Delivery Date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'shipping_estimated_delivery'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN shipping_estimated_delivery date;
  END IF;

  -- 6. Shipping Notes / Internal Logistics Memo
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'shipping_notes'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN shipping_notes text;
  END IF;
END $$;

-- Performance index for fast order lookup by tracking number
CREATE INDEX IF NOT EXISTS idx_orders_shipping_tracking_number
  ON public.orders (shipping_tracking_number)
  WHERE shipping_tracking_number IS NOT NULL;
