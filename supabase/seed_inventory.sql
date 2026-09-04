-- ==============================================================================
-- CJVELORA — Supabase Product Inventory Initialization (21 Products)
-- ==============================================================================
-- Initializes exactly 1 inventory record for each of the 21 products.
-- Sets:
--   - quantity = 0
--   - reserved_quantity = 0
--   - low_stock_threshold = 5
--
-- Idempotency:
--   Uses WHERE NOT EXISTS to guarantee no duplicate rows are created
--   if an inventory record already exists for a product.
-- ==============================================================================

INSERT INTO public.inventory (
  product_id,
  quantity,
  reserved_quantity,
  low_stock_threshold
)
SELECT
  p.id AS product_id,
  0 AS quantity,
  0 AS reserved_quantity,
  5 AS low_stock_threshold
FROM public.products p
WHERE NOT EXISTS (
  SELECT 1
  FROM public.inventory i
  WHERE i.product_id = p.id
);

-- Ensure RLS policy for inventory (public read access):
ALTER TABLE IF EXISTS public.inventory ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'inventory' AND policyname = 'Allow public read access to inventory'
  ) THEN
    CREATE POLICY "Allow public read access to inventory"
      ON public.inventory
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;
