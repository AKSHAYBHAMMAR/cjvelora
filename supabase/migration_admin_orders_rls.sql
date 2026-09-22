-- ==============================================================================
-- CJVELORA — DATABASE MIGRATION: ADMIN ORDERS & ORDER_ITEMS RLS POLICIES
-- ==============================================================================
-- 1. SECURITY DEFINER Role Helper Function
-- Securely verifies if a user ID is authorized as super_admin or staff.
-- Uses SECURITY DEFINER with fixed search_path to eliminate RLS recursion risks.
-- Returns boolean, exposing zero internal table row data.
-- ==============================================================================

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

-- Revoke public execution and grant to authenticated and service_role
REVOKE ALL ON FUNCTION public.is_admin_or_staff(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_or_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_staff(uuid) TO service_role;

-- ==============================================================================
-- 2. ROW LEVEL SECURITY ON ORDERS
-- Ensure RLS is active on orders table.
-- Preserve existing customer isolation:
--   - Customers can view their own orders (customer_id = auth.uid())
--   - Customers can insert their own orders (customer_id = auth.uid())
-- Add minimum required admin privileges:
--   - SELECT: Admins/staff can view all orders for dashboard, orders, analytics, customers
--   - UPDATE: Admins/staff can update order status (processing, shipped, delivered, cancelled)
-- No admin DELETE or INSERT policies are granted (principle of least privilege).
-- ==============================================================================

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 2a. Admin SELECT Policy
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins can view all orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (public.is_admin_or_staff());

-- 2b. Admin UPDATE Policy
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update orders"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

-- ==============================================================================
-- 3. ROW LEVEL SECURITY ON ORDER_ITEMS
-- Ensure RLS is active on order_items table.
-- Preserve existing customer isolation:
--   - Customers can view order items belonging to their own orders
--   - Customers can insert order items for their own orders
-- Add minimum required admin privileges:
--   - SELECT: Admins/staff can view all order items
-- No admin UPDATE, INSERT, or DELETE policies granted (order_items are immutable line items).
-- ==============================================================================

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 3a. Admin SELECT Policy
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
CREATE POLICY "Admins can view all order items"
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (public.is_admin_or_staff());
