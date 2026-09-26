-- ==============================================================================
-- CJVELORA — DATABASE MIGRATION: ORDER PAYMENT SESSION PERSISTENCE FIX
-- ==============================================================================
-- Problem:
-- When an authenticated customer placed an order, the server created the order
-- record first with razorpay_order_id = NULL. Then, after Razorpay order creation
-- succeeded, it attempted an UPDATE via the customer's authenticated client.
-- However, Row Level Security (RLS) intentionally prevents non-admin customers
-- from executing UPDATE on public.orders. As a result, the UPDATE affected 0 rows,
-- leaving razorpay_order_id as NULL in the database. When /api/payments/verify ran,
-- it failed-closed with "Order does not have an active payment session."
--
-- Solution:
-- Update public.create_order_with_items() to accept an optional:
--   p_razorpay_order_id text DEFAULT NULL
-- parameter and insert it directly into public.orders.razorpay_order_id during
-- initial atomic order creation. This eliminates any need for a post-insert UPDATE
-- and preserves all existing RLS and payment verification security hardening.
-- ==============================================================================

-- 1. Drop old 18-parameter signature to prevent ambiguous overload resolution
DROP FUNCTION IF EXISTS public.create_order_with_items(
  text, uuid, text, text, text, text, text, text, text, text,
  text, text, text, numeric, numeric, numeric, numeric, jsonb
);

-- 2. Create updated 19-parameter function with p_razorpay_order_id DEFAULT NULL
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
  p_items jsonb,
  p_razorpay_order_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

  -- 2. Create the order header with authoritative razorpay_order_id bound in the initial insert
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
    razorpay_order_id,
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
    p_razorpay_order_id,
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
    'payment_status', 'pending',
    'razorpay_order_id', p_razorpay_order_id
  );
END;
$$;

-- 3. Revoke public execution and grant to authenticated and service_role
REVOKE ALL ON FUNCTION public.create_order_with_items(
  text, uuid, text, text, text, text, text, text, text, text,
  text, text, text, numeric, numeric, numeric, numeric, jsonb, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_order_with_items(
  text, uuid, text, text, text, text, text, text, text, text,
  text, text, text, numeric, numeric, numeric, numeric, jsonb, text
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.create_order_with_items(
  text, uuid, text, text, text, text, text, text, text, text,
  text, text, text, numeric, numeric, numeric, numeric, jsonb, text
) TO service_role;
