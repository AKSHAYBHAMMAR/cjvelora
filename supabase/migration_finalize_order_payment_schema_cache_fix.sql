-- ==============================================================================
-- CJVELORA — DATABASE MIGRATION: COMPLETE PAYMENT FINALIZATION & SCHEMA CACHE FIX
-- ==============================================================================
-- Root Cause Addressed:
-- 1. PostgREST Error PGRST202 ("Could not find the function public.finalize_order_payment in the schema cache"):
--    In tightened Supabase environments, revoking execution from PUBLIC while omitting anon
--    prevents the PostgREST schema introspector from indexing the RPC function in its in-memory
--    routing cache.
-- 2. PostgREST in Supabase does NOT automatically reload its internal schema cache on manual
--    DDL executions in the SQL editor unless explicitly instructed via NOTIFY pgrst, 'reload schema'.
-- 3. Fail-Closed Authentication & Ownership Enforcement:
--    The caller check now strictly requires auth.uid() to be NOT NULL and equal to customer_id:
--      IF v_caller_id IS NULL THEN RAISE EXCEPTION 'Unauthorized: Authentication required.';
--      IF v_caller_id <> v_order_customer_id THEN RAISE EXCEPTION 'Unauthorized: You do not own this order.';
-- 4. Full Overload Support:
--    Exposes both:
--      a) 3-parameter signature: finalize_order_payment(p_order_id uuid, p_razorpay_order_id text, p_razorpay_payment_id text)
--      b) Single JSONB parameter fallback: finalize_order_payment(p_params jsonb)
-- 5. Concurrency & Deadlock Prevention:
--    Preserves SELECT ... FOR UPDATE on orders and locks order items in deterministic order
--    (ORDER BY product_id ASC) to prevent transaction deadlocks.
-- ==============================================================================

-- 1. Database-Level Unique Index on razorpay_payment_id for Replay Protection
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_razorpay_payment_id_unique
  ON public.orders (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;

-- 2. Hardened Atomic RPC: finalize_order_payment (3-Parameter Signature)
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

  -- 2. Strict caller authentication and ownership check
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Authentication required.';
  END IF;

  IF v_caller_id <> v_order_customer_id THEN
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
    ORDER BY product_id ASC
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

-- 3. Overloaded single-parameter JSONB variant for PostgREST JSON-payload RPC routing
CREATE OR REPLACE FUNCTION public.finalize_order_payment(
  p_params jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN public.finalize_order_payment(
    (p_params->>'p_order_id')::uuid,
    (p_params->>'p_razorpay_order_id')::text,
    (p_params->>'p_razorpay_payment_id')::text
  );
END;
$$;

-- 4. Explicit execution grants for PostgREST schema cache discoverability
-- Safe because caller authentication (auth.uid() = customer_id) is enforced inside the functions
GRANT EXECUTE ON FUNCTION public.finalize_order_payment(uuid, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.finalize_order_payment(jsonb) TO anon, authenticated, service_role;

-- Also ensure create_order_with_items and cancel_order_reservation are executable and cached
GRANT EXECUTE ON FUNCTION public.create_order_with_items(text, uuid, text, text, text, text, text, text, text, text, text, text, text, numeric, numeric, numeric, numeric, jsonb, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_order_reservation(uuid, text) TO anon, authenticated, service_role;

-- 5. Force PostgREST to reload its in-memory schema cache immediately
NOTIFY pgrst, 'reload schema';
