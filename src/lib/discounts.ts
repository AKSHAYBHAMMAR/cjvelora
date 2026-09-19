import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  Discount,
  CreateDiscountInput,
  UpdateDiscountInput,
  ValidateCouponResult,
  DiscountType,
} from '@/types';

/**
 * Helper to obtain client-side JWT authorization headers for admin requests.
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
      // Ignore session retrieval issues in restricted contexts
    }
  }
  return headers;
}

/**
 * Helper to calculate discount amount based on subtotal.
 */
export function calculateDiscountAmount(
  discount: {
    discountType: DiscountType;
    discountValue: number;
    maximumDiscountAmount?: number | null;
  },
  subtotal: number
): number {
  if (!subtotal || subtotal <= 0) return 0;

  let amount = 0;
  if (discount.discountType === 'percentage') {
    amount = Math.round((subtotal * discount.discountValue) / 100);
    if (discount.maximumDiscountAmount && discount.maximumDiscountAmount > 0) {
      amount = Math.min(amount, discount.maximumDiscountAmount);
    }
  } else {
    // Fixed amount
    amount = Math.min(discount.discountValue, subtotal);
  }

  return Math.max(0, amount);
}

/**
 * Formats a human-readable discount display, e.g. "10%" or "₹500 OFF".
 */
export function formatDiscountValue(discountType: DiscountType, discountValue: number): string {
  if (discountType === 'percentage') {
    return `${discountValue}% OFF`;
  }
  return `₹${discountValue.toLocaleString('en-IN')} OFF`;
}

/**
 * Fetches all discounts for the Admin console.
 * Uses /api/admin/discounts endpoint.
 */
export async function getAdminDiscounts(): Promise<{
  success: boolean;
  discounts: Discount[];
  error?: string;
}> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/admin/discounts', {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    const result = await res.json();
    if (!res.ok || !result.success) {
      return {
        success: false,
        discounts: [],
        error: result.error || `HTTP error ${res.status}`,
      };
    }

    return {
      success: true,
      discounts: result.discounts || [],
    };
  } catch (err: any) {
    console.error('Error fetching admin discounts:', err);
    return {
      success: false,
      discounts: [],
      error: err?.message || 'Network error fetching discounts.',
    };
  }
}

/**
 * Creates a new discount via POST /api/admin/discounts.
 */
export async function createDiscount(
  payload: CreateDiscountInput
): Promise<{ success: boolean; discount?: Discount; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/admin/discounts', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    if (!res.ok || !result.success) {
      return {
        success: false,
        error: result.error || 'Failed to create discount.',
      };
    }

    return {
      success: true,
      discount: result.discount,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error creating discount.',
    };
  }
}

/**
 * Updates an existing discount via PATCH /api/admin/discounts/[discountId].
 */
export async function updateDiscount(
  discountId: string,
  payload: UpdateDiscountInput
): Promise<{ success: boolean; discount?: Discount; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/admin/discounts/${encodeURIComponent(discountId)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    if (!res.ok || !result.success) {
      return {
        success: false,
        error: result.error || 'Failed to update discount.',
      };
    }

    return {
      success: true,
      discount: result.discount,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error updating discount.',
    };
  }
}

/**
 * Toggles a discount's active status.
 */
export async function toggleDiscountActive(
  discountId: string,
  active: boolean
): Promise<{ success: boolean; discount?: Discount; error?: string }> {
  return updateDiscount(discountId, { active });
}

/**
 * Deletes a discount safely via DELETE /api/admin/discounts/[discountId].
 * If the discount has usage history, returns conflict error with usage count.
 */
export async function deleteDiscount(
  discountId: string
): Promise<{
  success: boolean;
  deleted?: boolean;
  hasUsage?: boolean;
  usageCount?: number;
  message?: string;
  error?: string;
}> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/admin/discounts/${encodeURIComponent(discountId)}`, {
      method: 'DELETE',
      headers,
    });

    const result = await res.json();
    if (!res.ok || !result.success) {
      return {
        success: false,
        hasUsage: result.hasUsage || false,
        usageCount: result.usageCount || 0,
        message: result.message,
        error: result.error || 'Failed to delete discount.',
      };
    }

    return {
      success: true,
      deleted: true,
      message: result.message || 'Discount successfully deleted.',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error deleting discount.',
    };
  }
}

/**
 * Validates a coupon code against the server at checkout.
 */
export async function validateCoupon(
  code: string,
  subtotal: number,
  customerEmail?: string,
  customerId?: string
): Promise<ValidateCouponResult> {
  try {
    const res = await fetch('/api/discounts/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        subtotal,
        customerEmail,
        customerId,
      }),
    });

    const result = await res.json();
    return result;
  } catch (err: any) {
    return {
      valid: false,
      error: err?.message || 'Network error validating coupon code.',
    };
  }
}
