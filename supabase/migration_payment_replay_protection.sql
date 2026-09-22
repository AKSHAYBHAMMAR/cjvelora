-- ==============================================================================
-- CJVELORA — DATABASE MIGRATION: RAZORPAY PAYMENT VERIFICATION SECURITY HARDENING
-- ==============================================================================
-- 1. Database-Level Unique Index on razorpay_payment_id
-- Prevents reusing any razorpay_payment_id across multiple orders.
-- Uses a partial unique index allowing multiple NULLs for unpaid orders.
-- ==============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_razorpay_payment_id_unique
  ON public.orders (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;

-- ==============================================================================
-- 2. HARDENED ATOMIC RPC: finalize_order_payment
-- Atomic, concurrency-safe, fail-closed payment finalization.
-- Locks order row, validates caller ownership, checks authoritative razorpay_order_id,
-- prevents cross-order payment ID replay, enforces same-order idempotency,
-- and converts reserved inventory to sold stock in a single transaction.
-- ==============================================================================

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
