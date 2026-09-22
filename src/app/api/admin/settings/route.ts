import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/adminAuth';
import {
  AllAppSettings,
  PaymentEnvStatus,
  SettingsSectionKey,
  StoreSettings,
  OrderSettings,
  InventorySettings,
  ShippingSettings,
  PaymentSettings,
  NotificationSettings,
} from '@/types/settings';

export const dynamic = 'force-dynamic';

// Canonical fallback settings ensuring robust operation
const DEFAULT_SETTINGS: AllAppSettings = {
  store: {
    storeName: 'VELORA Atelier',
    tagline: 'Luxury Handcrafted Crochet Heirloom Creations',
    contactEmail: 'contact@velora.in',
    supportPhone: '+91 98765 43210',
    operatingAddress: 'Velora Luxury Atelier, Craft District, Mumbai, India',
    currencyCode: 'INR',
    currencySymbol: '₹',
    socialInstagram: 'https://instagram.com/cjvelora',
    socialWhatsapp: '+919876543210',
    socialPinterest: 'https://pinterest.com/cjvelora',
    announcementBannerText: 'Complimentary bespoke luxury packaging on all heirloom orders across India',
    announcementBannerEnabled: true,
    maintenanceMode: false,
  },
  orders: {
    orderPrefix: 'VEL-',
    minOrderAmount: 0,
    enableGuestCheckout: true,
    autoCancelUnpaidMinutes: 60,
    taxRatePercent: 18,
    pricesIncludeTax: true,
    invoiceFooterNote: 'Thank you for choosing VELORA handcrafted luxury. Every stitch tells an artisanal story.',
  },
  inventory: {
    defaultLowStockThreshold: 3,
    outOfStockBehavior: 'show_out_of_stock',
    stockReservationMinutes: 15,
    enableInventoryAuditLog: true,
    notifyLowStock: true,
  },
  shipping: {
    standardShippingFee: 150,
    freeShippingThreshold: 2500,
    expressShippingFee: 350,
    enableExpressShipping: true,
    estimatedDeliveryDaysStandard: '4-7 business days',
    estimatedDeliveryDaysExpress: '2-3 business days',
    enableInternationalShipping: false,
    shippingOriginCity: 'Mumbai, Maharashtra',
  },
  payments: {
    codEnabled: true,
    codMaxAmount: 10000,
    prepaidDiscountPercent: 0,
    enforcePaymentVerification: true,
  },
  notifications: {
    orderConfirmationEmail: true,
    orderShippedEmail: true,
    orderCancelledEmail: true,
    lowStockAlertEmail: true,
    adminNotificationEmails: 'admin@velora.in, orders@velora.in',
    customerSmsNotifications: false,
    customerWhatsappNotifications: true,
  },
};

/**
 * Determines environment variable statuses without exposing secret values.
 */
function getEnvironmentStatus(): PaymentEnvStatus {
  const rzpKeyId = (
    process.env.RAZORPAY_KEY_ID ||
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
    ''
  ).trim();
  const rzpSecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();

  let razorpayKeyIdMode: 'live' | 'test' | 'none' = 'none';
  if (rzpKeyId && !rzpKeyId.includes('placeholder')) {
    if (rzpKeyId.startsWith('rzp_live')) {
      razorpayKeyIdMode = 'live';
    } else if (rzpKeyId.startsWith('rzp_test')) {
      razorpayKeyIdMode = 'test';
    } else {
      razorpayKeyIdMode = 'test';
    }
  }

  const razorpayKeyIdConfigured = razorpayKeyIdMode !== 'none';
  const razorpaySecretConfigured = Boolean(
    rzpSecret && !rzpSecret.includes('placeholder')
  );

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const supabaseUrlConfigured = Boolean(
    supabaseUrl &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('placeholder')
  );

  const supabaseAnonKey = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  ).trim();
  const supabaseAnonKeyConfigured = Boolean(
    supabaseAnonKey && !supabaseAnonKey.includes('placeholder')
  );

  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const supabaseServiceRoleConfigured = Boolean(
    serviceRoleKey && !serviceRoleKey.includes('placeholder')
  );

  return {
    razorpayKeyIdConfigured,
    razorpayKeyIdMode,
    razorpaySecretConfigured,
    supabaseUrlConfigured,
    supabaseAnonKeyConfigured,
    supabaseServiceRoleConfigured,
  };
}

/**
 * GET /api/admin/settings
 * Retrieves all configuration settings, environmental statuses, and caller role.
 */
export async function GET(req: NextRequest) {
  try {
    const { admin, adminProfile, supabase: db, error: authErr, status: authStatus } = await authenticateAdmin(req);
    if (!admin || !db || !adminProfile) {
      return NextResponse.json({ success: false, error: authErr }, { status: authStatus });
    }

    const mergedSettings: AllAppSettings = {
      store: { ...DEFAULT_SETTINGS.store },
      orders: { ...DEFAULT_SETTINGS.orders },
      inventory: { ...DEFAULT_SETTINGS.inventory },
      shipping: { ...DEFAULT_SETTINGS.shipping },
      payments: { ...DEFAULT_SETTINGS.payments },
      notifications: { ...DEFAULT_SETTINGS.notifications },
    };

    let latestUpdatedAt: string | undefined;

    // Fetch persistent database configurations if available
    try {
      const { data, error } = await db
        .from('app_settings')
        .select('key, value, updated_at');

      if (!error && data && Array.isArray(data)) {
        for (const row of data) {
          const k = row.key as SettingsSectionKey;
          if (k in mergedSettings && row.value && typeof row.value === 'object') {
            mergedSettings[k] = {
              ...mergedSettings[k],
              ...row.value,
            };
          }
          if (row.updated_at && (!latestUpdatedAt || row.updated_at > latestUpdatedAt)) {
            latestUpdatedAt = row.updated_at;
          }
        }
      }
    } catch (dbErr) {
      console.warn('Unable to query app_settings table (using defaults):', dbErr);
    }

    const envStatus = getEnvironmentStatus();

    return NextResponse.json({
      success: true,
      settings: mergedSettings,
      envStatus,
      adminRole: adminProfile.role,
      adminEmail: adminProfile.email,
      updatedAt: latestUpdatedAt,
    });
  } catch (err: any) {
    console.error('Unexpected error in GET /api/admin/settings:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error fetching settings.' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/settings
 * Updates a specific settings section with role enforcement & input validation.
 */
export async function PUT(req: NextRequest) {
  try {
    const { admin, adminProfile, supabase: db, error: authErr, status: authStatus } = await authenticateAdmin(req);
    if (!admin || !db || !adminProfile) {
      return NextResponse.json({ success: false, error: authErr }, { status: authStatus });
    }

    const body = await req.json();
    const { section, data } = body;

    const validSections: SettingsSectionKey[] = [
      'store',
      'orders',
      'inventory',
      'shipping',
      'payments',
      'notifications',
    ];

    if (!section || !validSections.includes(section)) {
      return NextResponse.json(
        { success: false, error: `Invalid settings section "${section}".` },
        { status: 400 }
      );
    }

    if (!data || typeof data !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Request body must contain valid setting data object.' },
        { status: 400 }
      );
    }

    // SUPER ADMIN RESTRICTION:
    // 1. Payment configuration policies
    // 2. Maintenance mode toggle
    const isSensitive =
      section === 'payments' ||
      (section === 'store' && 'maintenanceMode' in data);

    if (isSensitive && adminProfile.role !== 'super_admin') {
      return NextResponse.json(
        {
          success: false,
          error:
            'Forbidden: Super Administrator clearance is required to modify sensitive system configuration.',
        },
        { status: 403 }
      );
    }

    // Sanitize and validate inputs per section
    let sanitizedData: any = {};

    if (section === 'store') {
      const current = DEFAULT_SETTINGS.store;
      sanitizedData = {
        storeName: String(data.storeName ?? current.storeName).trim() || current.storeName,
        tagline: String(data.tagline ?? current.tagline).trim(),
        contactEmail: String(data.contactEmail ?? current.contactEmail).trim(),
        supportPhone: String(data.supportPhone ?? current.supportPhone).trim(),
        operatingAddress: String(data.operatingAddress ?? current.operatingAddress).trim(),
        currencyCode: String(data.currencyCode ?? current.currencyCode).trim().toUpperCase(),
        currencySymbol: String(data.currencySymbol ?? current.currencySymbol).trim(),
        socialInstagram: String(data.socialInstagram ?? current.socialInstagram).trim(),
        socialWhatsapp: String(data.socialWhatsapp ?? current.socialWhatsapp).trim(),
        socialPinterest: String(data.socialPinterest ?? current.socialPinterest).trim(),
        announcementBannerText: String(data.announcementBannerText ?? current.announcementBannerText).trim(),
        announcementBannerEnabled: Boolean(data.announcementBannerEnabled ?? current.announcementBannerEnabled),
        maintenanceMode: Boolean(data.maintenanceMode ?? current.maintenanceMode),
      };
    } else if (section === 'orders') {
      const current = DEFAULT_SETTINGS.orders;
      const minOrder = Number(data.minOrderAmount ?? current.minOrderAmount);
      const taxRate = Number(data.taxRatePercent ?? current.taxRatePercent);
      const cancelMinutes = Number(data.autoCancelUnpaidMinutes ?? current.autoCancelUnpaidMinutes);

      sanitizedData = {
        orderPrefix: String(data.orderPrefix ?? current.orderPrefix).trim().toUpperCase() || 'VEL-',
        minOrderAmount: isNaN(minOrder) || minOrder < 0 ? 0 : Math.round(minOrder),
        enableGuestCheckout: Boolean(data.enableGuestCheckout ?? current.enableGuestCheckout),
        autoCancelUnpaidMinutes: isNaN(cancelMinutes) || cancelMinutes < 5 ? 60 : Math.round(cancelMinutes),
        taxRatePercent: isNaN(taxRate) || taxRate < 0 || taxRate > 100 ? 18 : Number(taxRate.toFixed(2)),
        pricesIncludeTax: Boolean(data.pricesIncludeTax ?? current.pricesIncludeTax),
        invoiceFooterNote: String(data.invoiceFooterNote ?? current.invoiceFooterNote).trim(),
      };
    } else if (section === 'inventory') {
      const current = DEFAULT_SETTINGS.inventory;
      const threshold = Number(data.defaultLowStockThreshold ?? current.defaultLowStockThreshold);
      const resMinutes = Number(data.stockReservationMinutes ?? current.stockReservationMinutes);

      const validOos: any[] = ['show_out_of_stock', 'allow_backorder', 'hide'];
      const oosBehavior = validOos.includes(data.outOfStockBehavior)
        ? data.outOfStockBehavior
        : current.outOfStockBehavior;

      sanitizedData = {
        defaultLowStockThreshold: isNaN(threshold) || threshold < 0 ? 3 : Math.round(threshold),
        outOfStockBehavior: oosBehavior,
        stockReservationMinutes: isNaN(resMinutes) || resMinutes < 1 ? 15 : Math.round(resMinutes),
        enableInventoryAuditLog: Boolean(data.enableInventoryAuditLog ?? current.enableInventoryAuditLog),
        notifyLowStock: Boolean(data.notifyLowStock ?? current.notifyLowStock),
      };
    } else if (section === 'shipping') {
      const current = DEFAULT_SETTINGS.shipping;
      const stdFee = Number(data.standardShippingFee ?? current.standardShippingFee);
      const freeThresh = Number(data.freeShippingThreshold ?? current.freeShippingThreshold);
      const expFee = Number(data.expressShippingFee ?? current.expressShippingFee);

      sanitizedData = {
        standardShippingFee: isNaN(stdFee) || stdFee < 0 ? 0 : Math.round(stdFee),
        freeShippingThreshold: isNaN(freeThresh) || freeThresh < 0 ? 0 : Math.round(freeThresh),
        expressShippingFee: isNaN(expFee) || expFee < 0 ? 0 : Math.round(expFee),
        enableExpressShipping: Boolean(data.enableExpressShipping ?? current.enableExpressShipping),
        estimatedDeliveryDaysStandard: String(
          data.estimatedDeliveryDaysStandard ?? current.estimatedDeliveryDaysStandard
        ).trim(),
        estimatedDeliveryDaysExpress: String(
          data.estimatedDeliveryDaysExpress ?? current.estimatedDeliveryDaysExpress
        ).trim(),
        enableInternationalShipping: Boolean(
          data.enableInternationalShipping ?? current.enableInternationalShipping
        ),
        shippingOriginCity: String(data.shippingOriginCity ?? current.shippingOriginCity).trim(),
      };
    } else if (section === 'payments') {
      const current = DEFAULT_SETTINGS.payments;
      const codMax = Number(data.codMaxAmount ?? current.codMaxAmount);
      const prepDisc = Number(data.prepaidDiscountPercent ?? current.prepaidDiscountPercent);

      // Explicitly reject any attempts to submit secret keys
      if ('razorpaySecret' in data || 'serviceRoleKey' in data || 'secretKey' in data) {
        return NextResponse.json(
          { success: false, error: 'Storing secret keys in settings is strictly prohibited.' },
          { status: 400 }
        );
      }

      sanitizedData = {
        codEnabled: Boolean(data.codEnabled ?? current.codEnabled),
        codMaxAmount: isNaN(codMax) || codMax < 0 ? 10000 : Math.round(codMax),
        prepaidDiscountPercent: isNaN(prepDisc) || prepDisc < 0 || prepDisc > 100 ? 0 : Number(prepDisc.toFixed(1)),
        enforcePaymentVerification: Boolean(data.enforcePaymentVerification ?? current.enforcePaymentVerification),
      };
    } else if (section === 'notifications') {
      const current = DEFAULT_SETTINGS.notifications;
      sanitizedData = {
        orderConfirmationEmail: Boolean(data.orderConfirmationEmail ?? current.orderConfirmationEmail),
        orderShippedEmail: Boolean(data.orderShippedEmail ?? current.orderShippedEmail),
        orderCancelledEmail: Boolean(data.orderCancelledEmail ?? current.orderCancelledEmail),
        lowStockAlertEmail: Boolean(data.lowStockAlertEmail ?? current.lowStockAlertEmail),
        adminNotificationEmails: String(data.adminNotificationEmails ?? current.adminNotificationEmails).trim(),
        customerSmsNotifications: Boolean(data.customerSmsNotifications ?? current.customerSmsNotifications),
        customerWhatsappNotifications: Boolean(data.customerWhatsappNotifications ?? current.customerWhatsappNotifications),
      };
    }

    // Persist to public.app_settings
    const nowIso = new Date().toISOString();
    const { error: upsertError } = await db
      .from('app_settings')
      .upsert(
        {
          key: section,
          value: sanitizedData,
          is_sensitive: isSensitive,
          updated_at: nowIso,
          updated_by: adminProfile.id,
        },
        { onConflict: 'key' }
      );

    if (upsertError) {
      console.error('Error saving app_settings to database:', upsertError);
      return NextResponse.json(
        {
          success: false,
          error: `Database persistence failed: ${upsertError.message}. Please verify the app_settings migration has been executed.`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      section,
      data: sanitizedData,
      updatedAt: nowIso,
    });
  } catch (err: any) {
    console.error('Unexpected error in PUT /api/admin/settings:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error saving settings.' },
      { status: 500 }
    );
  }
}
