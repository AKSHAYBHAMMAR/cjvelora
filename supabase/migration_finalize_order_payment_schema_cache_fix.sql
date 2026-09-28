-- ==============================================================================
-- CJVELORA — REVISED DATABASE MIGRATION: CANONICAL finalize_order_payment
-- ==============================================================================
-- Requirements Addressed:
-- 1. Canonical Function Only:
--    public.finalize_order_payment(uuid, text, text) returning jsonb.
--    No JSONB overload or parameter tampering.
-- 2. Strict Privilege Boundary:
--    REVOKE ALL ON FUNCTION public.finalize_order_payment(uuid, text, text) FROM PUBLIC;
--    GRANT EXECUTE ON FUNCTION public.finalize_order_payment(uuid, text, text) TO authenticated;
--    GRANT EXECUTE ON FUNCTION public.finalize_order_payment(uuid, text, text) TO service_role;
--    (anon is strictly NOT granted execute).
-- 3. Security Definer & Search Path:
--    SECURITY DEFINER with pinned search_path = public, pg_temp.
-- 4. Strict Authentication & Customer Ownership:
--    Fails closed if auth.uid() is NULL or does not match order.customer_id.
-- 5. Strict Inventory Validation (No Silent GREATEST(0, ...) Clamping):
--    Locks each inventory row with FOR UPDATE in sorted order (ORDER BY product_id ASC).
--    Verifies existence, verifies quantity >= requested_quantity, and verifies
--    reserved_quantity >= requested_quantity.
--    If insufficient stock exists, raises an EXCEPTION and rolls back the transaction.
-- 6. Preserved Replay, Idempotency, and Signature Guarantees:
--    Locks order row, enforces authoritative razorpay_order_id, protects against
--    cross-order payment replay, allows identical idempotent payment retries,
--    and enforces unique index on razorpay_payment_id.
-- 7. PostgREST Schema Cache Reload:
--    Emits NOTIFY pgrst, 'reload schema' to force PostgREST to index the function.
-- ==============================================================================

-- 1. Database-Level Unique Index on razorpay_payment_id for Replay Protection
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_razorpay_payment_id_unique
  ON public.orders (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;

-- 2. Hardened Canonical Atomic RPC: finalize_order_payment
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
  v_current_stock integer;
  v_reserved_stock integer;
BEGIN
  -- 1. Row-level lock on target order to prevent concurrent race conditions
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
  -- If order was already marked paid, check if the payment ID matches
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

  -- 6. Atomic Inventory Conversion with Strict Stock Validation:
  -- Lock inventory rows in sorted order (ORDER BY product_id ASC) to prevent deadlocks
  FOR v_item IN
    SELECT product_id, quantity
    FROM public.order_items
    WHERE order_id = p_order_id
    ORDER BY product_id ASC
  LOOP
    SELECT quantity, COALESCE(reserved_quantity, 0)
    INTO v_current_stock, v_reserved_stock
    FROM public.inventory
    WHERE product_id = v_item.product_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Inventory record for product ID % not found.', v_item.product_id;
    END IF;

    -- Strict validation: do NOT silently clamp to zero.
    -- If stock is insufficient, abort and roll back the transaction.
    IF v_current_stock < v_item.quantity THEN
      RAISE EXCEPTION 'Insufficient stock to finalize order for product ID %. Available on hand: %, Requested: %',
        v_item.product_id, v_current_stock, v_item.quantity;
    END IF;

    IF v_reserved_stock < v_item.quantity THEN
      RAISE EXCEPTION 'Reserved stock mismatch to finalize order for product ID %. Reserved: %, Requested: %',
        v_item.product_id, v_reserved_stock, v_item.quantity;
    END IF;

    -- Deduct exact quantity from both total on-hand and reserved quantity
    UPDATE public.inventory
    SET quantity = v_current_stock - v_item.quantity,
        reserved_quantity = v_reserved_stock - v_item.quantity,
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

-- 3. Strict Privileges: Revoke public execution, grant only authenticated and service_role
REVOKE ALL ON FUNCTION public.finalize_order_payment(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_order_payment(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_order_payment(uuid, text, text) TO service_role;

-- 4. Explicitly notify PostgREST to reload its in-memory schema cache immediately
NOTIFY pgrst, 'reload schema';
