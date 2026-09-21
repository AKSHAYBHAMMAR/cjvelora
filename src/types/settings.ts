export interface StoreSettings {
  storeName: string;
  tagline: string;
  contactEmail: string;
  supportPhone: string;
  operatingAddress: string;
  currencyCode: string;
  currencySymbol: string;
  socialInstagram: string;
  socialWhatsapp: string;
  socialPinterest: string;
  announcementBannerText: string;
  announcementBannerEnabled: boolean;
  maintenanceMode: boolean; // Sensitive: super_admin only
}

export interface OrderSettings {
  orderPrefix: string;
  minOrderAmount: number;
  enableGuestCheckout: boolean;
  autoCancelUnpaidMinutes: number;
  taxRatePercent: number;
  pricesIncludeTax: boolean;
  invoiceFooterNote: string;
}

export type OutOfStockBehavior = 'show_out_of_stock' | 'allow_backorder' | 'hide';

export interface InventorySettings {
  defaultLowStockThreshold: number;
  outOfStockBehavior: OutOfStockBehavior;
  stockReservationMinutes: number;
  enableInventoryAuditLog: boolean;
  notifyLowStock: boolean;
}

export interface ShippingSettings {
  standardShippingFee: number;
  freeShippingThreshold: number;
  expressShippingFee: number;
  enableExpressShipping: boolean;
  estimatedDeliveryDaysStandard: string;
  estimatedDeliveryDaysExpress: string;
  enableInternationalShipping: boolean;
  shippingOriginCity: string;
}

export interface PaymentSettings {
  codEnabled: boolean;
  codMaxAmount: number;
  prepaidDiscountPercent: number;
  enforcePaymentVerification: boolean;
}

export interface PaymentEnvStatus {
  razorpayKeyIdConfigured: boolean;
  razorpayKeyIdMode: 'live' | 'test' | 'none';
  razorpaySecretConfigured: boolean;
  supabaseUrlConfigured: boolean;
  supabaseAnonKeyConfigured: boolean;
  supabaseServiceRoleConfigured: boolean;
}

export interface NotificationSettings {
  orderConfirmationEmail: boolean;
  orderShippedEmail: boolean;
  orderCancelledEmail: boolean;
  lowStockAlertEmail: boolean;
  adminNotificationEmails: string;
  customerSmsNotifications: boolean;
  customerWhatsappNotifications: boolean;
}

export interface AllAppSettings {
  store: StoreSettings;
  orders: OrderSettings;
  inventory: InventorySettings;
  shipping: ShippingSettings;
  payments: PaymentSettings;
  notifications: NotificationSettings;
}

export type SettingsSectionKey = keyof AllAppSettings;

export interface SettingsApiResponse {
  success: boolean;
  settings: AllAppSettings;
  envStatus: PaymentEnvStatus;
  adminRole: 'super_admin' | 'staff';
  adminEmail: string;
  updatedAt?: string;
  error?: string;
}

export interface UpdateSettingsSectionPayload {
  section: SettingsSectionKey;
  data: Partial<AllAppSettings[SettingsSectionKey]>;
}
