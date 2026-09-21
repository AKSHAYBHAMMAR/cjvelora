import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  AllAppSettings,
  SettingsSectionKey,
  SettingsApiResponse,
  StoreSettings,
  OrderSettings,
  InventorySettings,
  ShippingSettings,
  PaymentSettings,
  NotificationSettings,
} from '@/types/settings';

/**
 * Retrieves client-side JWT authorization headers for admin requests.
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined' && isSupabaseConfigured) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    } catch {
      // Ignore session retrieval issues in restricted browser modes
    }
  }
  return headers;
}

/**
 * Fetches all settings, environment status flags, and admin privileges.
 */
export async function fetchAdminSettings(): Promise<SettingsApiResponse> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/admin/settings', {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(result.error || `HTTP error ${res.status}`);
    }

    return result as SettingsApiResponse;
  } catch (err: any) {
    console.error('Error in fetchAdminSettings:', err);
    throw err;
  }
}

/**
 * Persists changes for an individual settings section.
 */
export async function saveAdminSettingsSection<K extends SettingsSectionKey>(
  section: K,
  data: Partial<AllAppSettings[K]>
): Promise<{ success: boolean; section: K; data: AllAppSettings[K]; updatedAt?: string; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers,
      body: JSON.stringify({ section, data }),
    });

    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(result.error || `Failed to save ${section} settings (HTTP ${res.status})`);
    }

    return result;
  } catch (err: any) {
    console.error(`Error saving settings section "${section}":`, err);
    throw err;
  }
}

/**
 * Updates the authenticated admin's password via Supabase Auth.
 */
export async function updateAdminPassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase authentication service is not configured.' };
    }

    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: 'New password must be at least 8 characters long.' };
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'An unexpected error occurred while updating password.' };
  }
}

// -----------------------------------------------------------------------------
// Validation Utilities
// -----------------------------------------------------------------------------

export function isValidEmail(email: string): boolean {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email.trim());
}

export function validateStoreSettings(settings: StoreSettings): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!settings.storeName.trim()) errors.storeName = 'Store name is required.';
  if (settings.contactEmail && !isValidEmail(settings.contactEmail)) {
    errors.contactEmail = 'Please provide a valid support email address.';
  }
  if (!settings.currencyCode.trim()) errors.currencyCode = 'Currency code is required.';
  if (!settings.currencySymbol.trim()) errors.currencySymbol = 'Currency symbol is required.';
  return errors;
}

export function validateOrderSettings(settings: OrderSettings): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!settings.orderPrefix.trim()) errors.orderPrefix = 'Order prefix is required.';
  if (settings.minOrderAmount < 0) errors.minOrderAmount = 'Minimum order amount cannot be negative.';
  if (settings.autoCancelUnpaidMinutes < 5) {
    errors.autoCancelUnpaidMinutes = 'Auto-cancel timer must be at least 5 minutes.';
  }
  if (settings.taxRatePercent < 0 || settings.taxRatePercent > 100) {
    errors.taxRatePercent = 'Tax rate must be between 0% and 100%.';
  }
  return errors;
}

export function validateInventorySettings(settings: InventorySettings): Record<string, string> {
  const errors: Record<string, string> = {};
  if (settings.defaultLowStockThreshold < 0) {
    errors.defaultLowStockThreshold = 'Low stock threshold cannot be negative.';
  }
  if (settings.stockReservationMinutes < 1) {
    errors.stockReservationMinutes = 'Reservation duration must be at least 1 minute.';
  }
  return errors;
}

export function validateShippingSettings(settings: ShippingSettings): Record<string, string> {
  const errors: Record<string, string> = {};
  if (settings.standardShippingFee < 0) {
    errors.standardShippingFee = 'Standard shipping fee cannot be negative.';
  }
  if (settings.freeShippingThreshold < 0) {
    errors.freeShippingThreshold = 'Free shipping threshold cannot be negative.';
  }
  if (settings.expressShippingFee < 0) {
    errors.expressShippingFee = 'Express shipping fee cannot be negative.';
  }
  return errors;
}

export function validatePaymentSettings(settings: PaymentSettings): Record<string, string> {
  const errors: Record<string, string> = {};
  if (settings.codMaxAmount < 0) {
    errors.codMaxAmount = 'Maximum COD order value cannot be negative.';
  }
  if (settings.prepaidDiscountPercent < 0 || settings.prepaidDiscountPercent > 100) {
    errors.prepaidDiscountPercent = 'Prepaid discount must be between 0% and 100%.';
  }
  return errors;
}

export function validateNotificationSettings(settings: NotificationSettings): Record<string, string> {
  const errors: Record<string, string> = {};
  if (settings.adminNotificationEmails.trim()) {
    const list = settings.adminNotificationEmails.split(',').map((e) => e.trim()).filter(Boolean);
    const invalid = list.filter((e) => !isValidEmail(e));
    if (invalid.length > 0) {
      errors.adminNotificationEmails = `Invalid email address(es): ${invalid.join(', ')}`;
    }
  }
  return errors;
}
