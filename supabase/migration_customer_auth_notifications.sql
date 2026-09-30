-- ==============================================================================
-- CJVELORA — DATABASE MIGRATION: CUSTOMER LOGIN NOTIFICATIONS & EVENT TRACKING
-- ==============================================================================
-- Architecture:
--   1. customer_login_notifications:
--      Deduplication table for login notifications (Welcome Back email).
--      Enforces UNIQUE(user_id, session_id) so the exact same session
--      never triggers duplicate Welcome Back emails.
--
--   2. customer_login_events:
--      Auditable log of customer authentication events.
--      Enables deterministic differentiation between FIRST LOGIN and
--      RETURNING LOGIN without guessing based on timestamps alone.
--
--   3. record_customer_login_event RPC:
--      Atomic SECURITY DEFINER function to check login history, record the event,
--      and determine if a Welcome Back notification should be dispatched.
--
--   4. mark_welcome_back_sent RPC:
--      Records completed email dispatch for a given session.
--
--   5. Row Level Security (RLS):
--      Guarantees customers can only access their own notification/event data.
-- ==============================================================================

-- 1. Create table: customer_login_notifications
CREATE TABLE IF NOT EXISTS public.customer_login_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id text NOT NULL,
  email text NOT NULL,
  notification_type text NOT NULL DEFAULT 'welcome_back',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT uq_customer_login_user_session UNIQUE(user_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_login_notifications_user_id
  ON public.customer_login_notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_customer_login_notifications_session
  ON public.customer_login_notifications(session_id);

-- 2. Create table: customer_login_events
CREATE TABLE IF NOT EXISTS public.customer_login_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL, -- 'signup_unconfirmed', 'email_verified', 'password_login', 'oauth_login'
  session_id text,
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_login_events_user_id
  ON public.customer_login_events(user_id);

CREATE INDEX IF NOT EXISTS idx_customer_login_events_created_at
  ON public.customer_login_events(created_at DESC);

-- 3. Atomic Login Event Evaluator Function
CREATE OR REPLACE FUNCTION public.record_customer_login_event(
  p_user_id uuid,
  p_session_id text,
  p_email text,
  p_event_type text DEFAULT 'password_login'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_already_notified boolean := false;
  v_prior_events_count integer := 0;
  v_prior_orders_count integer := 0;
  v_is_returning boolean := false;
  v_should_send_welcome boolean := false;
BEGIN
  IF p_user_id IS NULL OR p_session_id IS NULL OR p_email IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Missing required user parameters'
    );
  END IF;

  -- Step 1: Check if this session was already notified
  SELECT EXISTS (
    SELECT 1 FROM public.customer_login_notifications
    WHERE user_id = p_user_id AND session_id = p_session_id
  ) INTO v_already_notified;

  IF v_already_notified THEN
    RETURN jsonb_build_object(
      'success', true,
      'is_returning', true,
      'already_notified', true,
      'should_send_welcome', false,
      'reason', 'already_notified_for_session'
    );
  END IF;

  -- Step 2: Determine if this user is a FIRST LOGIN or RETURNING LOGIN
  -- Check prior successful authentication events (excluding current session)
  SELECT COUNT(*) INTO v_prior_events_count
  FROM public.customer_login_events
  WHERE user_id = p_user_id
    AND event_type IN ('email_verified', 'password_login', 'oauth_login')
    AND (session_id IS NULL OR session_id <> p_session_id);

  -- Check if customer has any historical orders
  SELECT COUNT(*) INTO v_prior_orders_count
  FROM public.orders
  WHERE customer_id = p_user_id
     OR (customer_email IS NOT NULL AND LOWER(customer_email) = LOWER(p_email));

  -- If customer has past login events or past orders, they are a returning customer
  IF v_prior_events_count > 0 OR v_prior_orders_count > 0 THEN
    v_is_returning := true;
  ELSE
    v_is_returning := false;
  END IF;

  -- Step 3: Record this login event
  INSERT INTO public.customer_login_events (
    user_id,
    event_type,
    session_id,
    email
  ) VALUES (
    p_user_id,
    p_event_type,
    p_session_id,
    p_email
  );

  -- Only send welcome back if user is a RETURNING customer
  IF v_is_returning THEN
    v_should_send_welcome := true;
  ELSE
    v_should_send_welcome := false;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'is_returning', v_is_returning,
    'already_notified', false,
    'should_send_welcome', v_should_send_welcome,
    'prior_events_count', v_prior_events_count,
    'prior_orders_count', v_prior_orders_count
  );
END;
$$;

-- 4. Mark Welcome Back Notification Sent Function
CREATE OR REPLACE FUNCTION public.mark_welcome_back_sent(
  p_user_id uuid,
  p_session_id text,
  p_email text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.customer_login_notifications (
    user_id,
    session_id,
    email,
    notification_type
  ) VALUES (
    p_user_id,
    p_session_id,
    p_email,
    'welcome_back'
  )
  ON CONFLICT (user_id, session_id) DO NOTHING;

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Revoke public execution and grant to authenticated and service_role
REVOKE ALL ON FUNCTION public.record_customer_login_event(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_customer_login_event(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_customer_login_event(uuid, text, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.mark_welcome_back_sent(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_welcome_back_sent(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_welcome_back_sent(uuid, text, text) TO service_role;

-- 5. Row Level Security
ALTER TABLE public.customer_login_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_login_events ENABLE ROW LEVEL SECURITY;

-- Customer policies for customer_login_notifications
DROP POLICY IF EXISTS "Customers can read own login notifications" ON public.customer_login_notifications;
CREATE POLICY "Customers can read own login notifications"
  ON public.customer_login_notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Customers can insert own login notifications" ON public.customer_login_notifications;
CREATE POLICY "Customers can insert own login notifications"
  ON public.customer_login_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Customer policies for customer_login_events
DROP POLICY IF EXISTS "Customers can read own login events" ON public.customer_login_events;
CREATE POLICY "Customers can read own login events"
  ON public.customer_login_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Customers can insert own login events" ON public.customer_login_events;
CREATE POLICY "Customers can insert own login events"
  ON public.customer_login_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
