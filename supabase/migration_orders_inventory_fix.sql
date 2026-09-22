-- ==============================================================================
-- VELORA / CJVELORA — Authoritative Database Migration & Architecture Fix
-- ==============================================================================
-- This migration is completely safe, idempotent, and additive:
--   1. Ensures all required columns exist in orders and order_items.
--   2. Enforces canonical naming: order_items.subtotal.
--   3. Adds performance indexes on relational keys.
--   4. Adds atomic transactional RPC functions:
--        - create_order_with_items (locks inventory, reserves stock, creates order & items)
--        - finalize_order_payment (converts reservation to sold stock upon verified payment)
--        - cancel_order_reservation (releases reservation on cancellation/expiration)
--   5. Hardens Row Level Security (RLS) for all tables.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ORDERS TABLE COLUMNS (Additive & Non-destructive)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  -- Customer details
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='customer_email') THEN
    ALTER TABLE public.orders ADD COLUMN customer_email text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='customer_phone') THEN
    ALTER TABLE public.orders ADD COLUMN customer_phone text;
  END IF;

  -- Shipping columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='shipping_name') THEN
    ALTER TABLE public.orders ADD COLUMN shipping_name text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='shipping_address') THEN
    ALTER TABLE public.orders ADD COLUMN shipping_address text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='shipping_address_line1') THEN
    ALTER TABLE public.orders ADD COLUMN shipping_address_line1 text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='shipping_city') THEN
    ALTER TABLE public.orders ADD COLUMN shipping_city text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='shipping_state') THEN
    ALTER TABLE public.orders ADD COLUMN shipping_state text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='shipping_postal_code') THEN
    ALTER TABLE public.orders ADD COLUMN shipping_postal_code text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='shipping_country') THEN
    ALTER TABLE public.orders ADD COLUMN shipping_country text DEFAULT 'India';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='shipping_phone') THEN
    ALTER TABLE public.orders ADD COLUMN shipping_phone text;
  END IF;

  -- Financial columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='subtotal') THEN
    ALTER TABLE public.orders ADD COLUMN subtotal numeric(12, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='discount') THEN
    ALTER TABLE public.orders ADD COLUMN discount numeric(12, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='discount_amount') THEN
    ALTER TABLE public.orders ADD COLUMN discount_amount numeric(12, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='shipping_fee') THEN
    ALTER TABLE public.orders ADD COLUMN shipping_fee numeric(12, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='shipping_amount') THEN
    ALTER TABLE public.orders ADD COLUMN shipping_amount numeric(12, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='total_amount') THEN
    ALTER TABLE public.orders ADD COLUMN total_amount numeric(12, 2) DEFAULT 0;
  END IF;

  -- Status columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='status') THEN
    ALTER TABLE public.orders ADD COLUMN status text DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='order_status') THEN
    ALTER TABLE public.orders ADD COLUMN order_status text DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='payment_status') THEN
    ALTER TABLE public.orders ADD COLUMN payment_status text DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='payment_method') THEN
    ALTER TABLE public.orders ADD COLUMN payment_method text DEFAULT 'razorpay';
  END IF;

  -- Razorpay tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='razorpay_order_id') THEN
    ALTER TABLE public.orders ADD COLUMN razorpay_order_id text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='razorpay_payment_id') THEN
    ALTER TABLE public.orders ADD COLUMN razorpay_payment_id text;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. ORDER_ITEMS TABLE COLUMNS (CANONICAL: subtotal)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  -- Canonical line total column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='order_items' AND column_name='subtotal') THEN
    ALTER TABLE public.order_items ADD COLUMN subtotal numeric(12, 2);
  END IF;

  -- Backwards-compatibility alias columns if accessed
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='order_items' AND column_name='product_name') THEN
    ALTER TABLE public.order_items ADD COLUMN product_name text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='order_items' AND column_name='unit_price') THEN
    ALTER TABLE public.order_items ADD COLUMN unit_price numeric(12, 2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='order_items' AND column_name='quantity') THEN
    ALTER TABLE public.order_items ADD COLUMN quantity integer DEFAULT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='order_items' AND column_name='product_image') THEN
    ALTER TABLE public.order_items ADD COLUMN product_image text;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. INVENTORY TABLE (Ensure reserved_quantity exists)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory' AND column_name='reserved_quantity') THEN
    ALTER TABLE public.inventory ADD COLUMN reserved_quantity integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory' AND column_name='low_stock_threshold') THEN
    ALTER TABLE public.inventory ADD COLUMN low_stock_threshold integer DEFAULT 5;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 4. PERFORMANCE INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON public.inventory(product_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_razorpay_payment_id_unique
  ON public.orders (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 5. ATOMIC RPC: create_order_with_items
-- Reserves stock, inserts orders row, inserts all order_items in ONE transaction.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_order_with_items(
  p_order_number text,
  p_customer_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_shipping_name text,
  p_shipping_address text,
  p_shipping_address_line1 text,
  p_shipping_city text,
  p_shipping_state text,
  p_shipping_postal_code text,
  p_shipping_country text,
  p_shipping_phone text,
  p_subtotal numeric,
  p_discount numeric,
  p_shipping_fee numeric,
  p_total_amount numeric,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_qty integer;
  v_unit_price numeric;
  v_subtotal numeric;
  v_product_name text;
  v_current_stock integer;
  v_reserved_stock integer;
  v_available_stock integer;
  v_caller_id uuid;
BEGIN
  -- Authenticated user validation
  v_caller_id := auth.uid();
  IF v_caller_id IS NOT NULL AND v_caller_id <> p_customer_id THEN
    RAISE EXCEPTION 'Unauthorized: Cannot create orders for another customer account.';
  END IF;

  -- 1. Reserve inventory with row locking (FOR UPDATE)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::integer;

    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Invalid item quantity: %', v_qty;
    END IF;

    -- Lock inventory row
    SELECT quantity, COALESCE(reserved_quantity, 0)
    INTO v_current_stock, v_reserved_stock
    FROM public.inventory
    WHERE product_id = v_product_id
    FOR UPDATE;

    IF FOUND THEN
      v_available_stock := v_current_stock - v_reserved_stock;
      IF v_available_stock < v_qty THEN
        RAISE EXCEPTION 'Insufficient stock for product id %. Available: %, Requested: %',
          v_product_id, v_available_stock, v_qty;
      END IF;

      -- Increment reserved stock
      UPDATE public.inventory
      SET reserved_quantity = v_reserved_stock + v_qty,
          updated_at = NOW()
      WHERE product_id = v_product_id;
    END IF;
  END LOOP;

  -- 2. Create the order header
  INSERT INTO public.orders (
    order_number,
    customer_id,
    customer_name,
    customer_email,
    customer_phone,
    shipping_name,
    shipping_address,
    shipping_address_line1,
    shipping_city,
    shipping_state,
    shipping_postal_code,
    shipping_country,
    shipping_phone,
    subtotal,
    discount,
    discount_amount,
    shipping_fee,
    shipping_amount,
    total_amount,
    status,
    order_status,
    payment_status,
    payment_method,
    created_at,
    updated_at
  ) VALUES (
    p_order_number,
    p_customer_id,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_shipping_name,
    p_shipping_address,
    p_shipping_address_line1,
    p_shipping_city,
    p_shipping_state,
    p_shipping_postal_code,
    COALESCE(p_shipping_country, 'India'),
    p_shipping_phone,
    p_subtotal,
    p_discount,
    p_discount,
    p_shipping_fee,
    p_shipping_fee,
    p_total_amount,
    'pending',
    'pending',
    'pending',
    'razorpay',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_order_id;

  -- 3. Create order_items with canonical subtotal
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_product_name := v_item->>'product_name';
    v_unit_price := (v_item->>'unit_price')::numeric;
    v_qty := (v_item->>'quantity')::integer;
    v_subtotal := COALESCE((v_item->>'subtotal')::numeric, v_unit_price * v_qty);

    INSERT INTO public.order_items (
      order_id,
      product_id,
      product_name,
      unit_price,
      quantity,
      subtotal,
      created_at
    ) VALUES (
      v_order_id,
      v_product_id,
      v_product_name,
      v_unit_price,
      v_qty,
      v_subtotal,
      NOW()
    );
  END LOOP;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', p_order_number,
    'total_amount', p_total_amount,
    'subtotal', p_subtotal,
    'payment_status', 'pending'
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. ATOMIC RPC: finalize_order_payment
-- Called when Razorpay signature is cryptographically verified server-side.
-- Converts reserved stock to sold stock and marks order paid.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finalize_order_payment(
  p_order_id uuid,
  p_razorpay_order_id text,
  p_razorpay_payment_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item record;
  v_current_payment_status text;
  v_existing_payment_id text;
  v_existing_rz_order_id text;
  v_order_customer_id uuid;
  v_caller_id uuid;
BEGIN
  -- 1. Row-level lock on the target order to prevent concurrent race conditions
  SELECT payment_status, razorpay_payment_id, razorpay_order_id, customer_id
  INTO v_current_payment_status, v_existing_payment_id, v_existing_rz_order_id, v_order_customer_id
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order with ID % not found.', p_order_id;
  END IF;

  -- 2. Caller ownership check: authenticated user must match customer_id
  v_caller_id := auth.uid();
  IF v_caller_id IS NOT NULL AND v_caller_id <> v_order_customer_id THEN
    RAISE EXCEPTION 'Unauthorized: You do not own this order.';
  END IF;

  -- 3. Authoritative order ID validation against database record
  IF v_existing_rz_order_id IS NOT NULL AND p_razorpay_order_id IS NOT NULL AND v_existing_rz_order_id <> p_razorpay_order_id THEN
    RAISE EXCEPTION 'Conflict: Authoritative Razorpay order ID mismatch.';
  END IF;

  -- 4. Same-order Idempotency Check:
  -- If order was already paid, check if the payment ID matches
  IF v_current_payment_status = 'paid' THEN
    IF v_existing_payment_id = p_razorpay_payment_id THEN
      RETURN jsonb_build_object(
        'success', true,
        'message', 'Order was already verified and marked paid.',
        'order_id', p_order_id
      );
    ELSE
      RAISE EXCEPTION 'Conflict: Order was already finalized with a different payment ID.';
    END IF;
  END IF;

  -- 5. Cross-Order Payment ID Replay Protection:
  -- Reject if this razorpay_payment_id has already been recorded on any other order
  IF EXISTS (
    SELECT 1 FROM public.orders
    WHERE razorpay_payment_id = p_razorpay_payment_id
      AND id <> p_order_id
  ) THEN
    RAISE EXCEPTION 'Conflict: Razorpay payment ID has already been redeemed for another order.';
  END IF;

  -- 6. Atomic Inventory Conversion: convert reserved stock to permanent sold stock
  FOR v_item IN
    SELECT product_id, quantity
    FROM public.order_items
    WHERE order_id = p_order_id
  LOOP
    UPDATE public.inventory
    SET quantity = GREATEST(0, quantity - v_item.quantity),
        reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - v_item.quantity),
        updated_at = NOW()
    WHERE product_id = v_item.product_id;
  END LOOP;

  -- 7. Mark order as paid and processing
  UPDATE public.orders
  SET payment_status = 'paid',
      status = 'processing',
      order_status = 'processing',
      razorpay_order_id = COALESCE(p_razorpay_order_id, razorpay_order_id),
      razorpay_payment_id = p_razorpay_payment_id,
      updated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Payment successfully finalized and stock deducted.',
    'order_id', p_order_id
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 7. ATOMIC RPC: cancel_order_reservation
-- Releases reserved inventory when an order is cancelled or expires.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_order_reservation(
  p_order_id uuid,
  p_reason text DEFAULT 'Order cancelled'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item record;
  v_current_status text;
  v_current_payment text;
BEGIN
  SELECT status, payment_status
  INTO v_current_status, v_current_payment
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found.';
  END IF;

  -- Only release reservation if payment was pending
  IF v_current_payment = 'pending' THEN
    FOR v_item IN
      SELECT product_id, quantity
      FROM public.order_items
      WHERE order_id = p_order_id
    LOOP
      UPDATE public.inventory
      SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - v_item.quantity),
          updated_at = NOW()
      WHERE product_id = v_item.product_id;
    END LOOP;
  END IF;

  UPDATE public.orders
  SET status = 'cancelled',
      order_status = 'cancelled',
      updated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'status', 'cancelled'
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- Helper function: check if authenticated user is super_admin or staff
CREATE OR REPLACE FUNCTION public.is_admin_or_staff(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check direct user_id match in admin_roles
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = p_user_id
      AND role IN ('super_admin', 'staff')
  ) INTO v_is_admin;

  IF v_is_admin THEN
    RETURN true;
  END IF;

  -- Fallback check by authenticated user email if user_id is not yet bound
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles ar
    JOIN auth.users u ON u.email = ar.email
    WHERE u.id = p_user_id
      AND ar.role IN ('super_admin', 'staff')
  ) INTO v_is_admin;

  RETURN v_is_admin;
END;
$$;

REVOKE ALL ON FUNCTION public.is_admin_or_staff(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_or_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_staff(uuid) TO service_role;

-- Orders: Customer can read own orders
DROP POLICY IF EXISTS "Customers can view their own orders" ON public.orders;
CREATE POLICY "Customers can view their own orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

-- Orders: Customer can create their own order
DROP POLICY IF EXISTS "Customers can insert their own orders" ON public.orders;
CREATE POLICY "Customers can insert their own orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

-- Orders: Admin can view all orders
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (public.is_admin_or_staff());

-- Orders: Admin can update order status
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

-- Order Items: Customer can view items belonging to their own orders
DROP POLICY IF EXISTS "Customers can view their order items" ON public.order_items;
CREATE POLICY "Customers can view their order items"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM public.orders WHERE customer_id = auth.uid()
    )
  );

-- Order Items: Customer can insert items for their own orders
DROP POLICY IF EXISTS "Customers can insert their order items" ON public.order_items;
CREATE POLICY "Customers can insert their order items"
  ON public.order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    order_id IN (
      SELECT id FROM public.orders WHERE customer_id = auth.uid()
    )
  );

-- Order Items: Admin can view all order items
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
CREATE POLICY "Admins can view all order items"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (public.is_admin_or_staff());

-- Inventory: Public can read stock
DROP POLICY IF EXISTS "Allow public read access to inventory" ON public.inventory;
CREATE POLICY "Allow public read access to inventory"
  ON public.inventory FOR SELECT
  TO anon, authenticated
  USING (true);

