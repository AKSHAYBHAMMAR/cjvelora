-- ==============================================================================
-- CJVELORA — DATABASE MIGRATION: SECURE finalize_order_payment RPC PERMISSIONS
-- ==============================================================================
-- Problem:
-- When an authenticated customer completes payment, /api/payments/verify calls
-- public.finalize_order_payment(p_order_id, p_razorpay_order_id, p_razorpay_payment_id)
-- via the customer's authenticated client (role: authenticated).
-- While the function was marked SECURITY DEFINER, earlier migrations did not
-- explicitly GRANT EXECUTE to the authenticated role and did not pin the
-- SECURITY DEFINER search_path. In tightened Supabase production environments,
-- this causes execution rejection (code 42501 permission denied) resulting in:
-- "Payment finalization failed. Stock and order state were not modified."
--
-- Solution:
-- 1. Ensure the database-level unique index on razorpay_payment_id exists.
-- 2. Define public.finalize_order_payment(uuid, text, text) with:
--      - SECURITY DEFINER
--      - SET search_path = public, pg_temp
--      - Complete preserved business logic: order locking (FOR UPDATE), caller
--        ownership verification (auth.uid()), authoritative Razorpay order ID check,
--        idempotent retry handling, cross-order payment ID replay prevention,
--        atomic inventory conversion (quantity & reserved_quantity), and
--        payment/order status progression ('paid' / 'processing').
-- 3. Explicitly REVOKE ALL FROM PUBLIC.
-- 4. Explicitly GRANT EXECUTE TO authenticated and service_role.
-- ==============================================================================

-- 1. Database-Level Unique Index on razorpay_payment_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_razorpay_payment_id_unique
  ON public.orders (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;

-- 2. Hardened Atomic RPC: finalize_order_payment with pinned search_path
CREATE OR REPLACE FUNCTION public.finalize_order_payment(
  p_order_id uuid,
  p_razorpay_order_id text,
  p_razorpay_payment_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

-- 3. Revoke public execution and explicitly grant to authenticated and service_role
REVOKE ALL ON FUNCTION public.finalize_order_payment(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_order_payment(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_order_payment(uuid, text, text) TO service_role;
