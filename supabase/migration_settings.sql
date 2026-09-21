-- ==============================================================================
-- VELORA / CJVELORA — Idempotent Admin Settings Table & RLS Migration
-- ==============================================================================
-- Creates the public.app_settings table for centralized store configuration.
-- Enforces Row-Level Security:
--   - SELECT: All authenticated admins ('super_admin', 'staff'), plus public
--             read for non-sensitive public store configuration (store, shipping).
--   - UPDATE (non-sensitive): Authenticated administrators ('super_admin', 'staff').
--   - UPDATE (sensitive): Restricted to 'super_admin' exclusively.
-- Zero secrets policy: Secrets (service-role keys, Razorpay secret keys) are NEVER
-- stored in this table or anywhere in the database.
-- ==============================================================================

-- 1. Create table public.app_settings
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_sensitive boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 2. Create index on is_sensitive for fast filtering
CREATE INDEX IF NOT EXISTS idx_app_settings_sensitive ON public.app_settings(is_sensitive);

-- 3. Seed canonical default settings safely (idempotent ON CONFLICT DO NOTHING)
INSERT INTO public.app_settings (key, value, is_sensitive)
VALUES
  (
    'store',
    '{
      "storeName": "VELORA Atelier",
      "tagline": "Luxury Handcrafted Crochet Heirloom Creations",
      "contactEmail": "contact@velora.in",
      "supportPhone": "+91 98765 43210",
      "operatingAddress": "Velora Luxury Atelier, Craft District, Mumbai, India",
      "currencyCode": "INR",
      "currencySymbol": "₹",
      "socialInstagram": "https://instagram.com/cjvelora",
      "socialWhatsapp": "+919876543210",
      "socialPinterest": "https://pinterest.com/cjvelora",
      "announcementBannerText": "Complimentary bespoke luxury packaging on all heirloom orders across India",
      "announcementBannerEnabled": true,
      "maintenanceMode": false
    }'::jsonb,
    false
  ),
  (
    'orders',
    '{
      "orderPrefix": "VEL-",
      "minOrderAmount": 0,
      "enableGuestCheckout": true,
      "autoCancelUnpaidMinutes": 60,
      "taxRatePercent": 18,
      "pricesIncludeTax": true,
      "invoiceFooterNote": "Thank you for choosing VELORA handcrafted luxury. Every stitch tells an artisanal story."
    }'::jsonb,
    false
  ),
  (
    'inventory',
    '{
      "defaultLowStockThreshold": 3,
      "outOfStockBehavior": "show_out_of_stock",
      "stockReservationMinutes": 15,
      "enableInventoryAuditLog": true,
      "notifyLowStock": true
    }'::jsonb,
    false
  ),
  (
    'shipping',
    '{
      "standardShippingFee": 150,
      "freeShippingThreshold": 2500,
      "expressShippingFee": 350,
      "enableExpressShipping": true,
      "estimatedDeliveryDaysStandard": "4-7 business days",
      "estimatedDeliveryDaysExpress": "2-3 business days",
      "enableInternationalShipping": false,
      "shippingOriginCity": "Mumbai, Maharashtra"
    }'::jsonb,
    false
  ),
  (
    'payments',
    '{
      "codEnabled": true,
      "codMaxAmount": 10000,
      "prepaidDiscountPercent": 0,
      "enforcePaymentVerification": true
    }'::jsonb,
    true
  ),
  (
    'notifications',
    '{
      "orderConfirmationEmail": true,
      "orderShippedEmail": true,
      "orderCancelledEmail": true,
      "lowStockAlertEmail": true,
      "adminNotificationEmails": "admin@velora.in, orders@velora.in",
      "customerSmsNotifications": false,
      "customerWhatsappNotifications": true
    }'::jsonb,
    false
  )
ON CONFLICT (key) DO NOTHING;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- 5. Define idempotent RLS Policies
DO $$
BEGIN
  -- 5a. Read policy for admins: allows super_admin and staff to select all app_settings
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'app_settings'
      AND policyname = 'Allow admins to read all app_settings'
  ) THEN
    CREATE POLICY "Allow admins to read all app_settings"
      ON public.app_settings
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.admin_roles
          WHERE user_id = auth.uid()
            AND role IN ('super_admin', 'staff')
        )
      );
  END IF;

  -- 5b. Public read policy: storefront / checkout can read public store and shipping configurations
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'app_settings'
      AND policyname = 'Allow public to read non-sensitive store settings'
  ) THEN
    CREATE POLICY "Allow public to read non-sensitive store settings"
      ON public.app_settings
      FOR SELECT
      TO anon, authenticated
      USING (
        key IN ('store', 'shipping')
      );
  END IF;

  -- 5c. Update policy for non-sensitive settings: super_admin and staff
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'app_settings'
      AND policyname = 'Allow admins to update non-sensitive app_settings'
  ) THEN
    CREATE POLICY "Allow admins to update non-sensitive app_settings"
      ON public.app_settings
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.admin_roles
          WHERE user_id = auth.uid()
            AND role IN ('super_admin', 'staff')
        )
        AND is_sensitive = false
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.admin_roles
          WHERE user_id = auth.uid()
            AND role IN ('super_admin', 'staff')
        )
      );
  END IF;

  -- 5d. Update policy for sensitive settings: super_admin only
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'app_settings'
      AND policyname = 'Allow super_admin only to update sensitive app_settings'
  ) THEN
    CREATE POLICY "Allow super_admin only to update sensitive app_settings"
      ON public.app_settings
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.admin_roles
          WHERE user_id = auth.uid()
            AND role = 'super_admin'
        )
        AND is_sensitive = true
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.admin_roles
          WHERE user_id = auth.uid()
            AND role = 'super_admin'
        )
      );
  END IF;

  -- 5e. Insert policy for super_admin
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'app_settings'
      AND policyname = 'Allow super_admin to insert app_settings'
  ) THEN
    CREATE POLICY "Allow super_admin to insert app_settings"
      ON public.app_settings
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.admin_roles
          WHERE user_id = auth.uid()
            AND role = 'super_admin'
        )
      );
  END IF;
END $$;
