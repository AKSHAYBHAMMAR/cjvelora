import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { AdminCustomerSummary, AdminCustomerDetail } from '@/types';

export interface CustomerQueryParams {
  search?: string;
  filter?: 'all' | 'with-orders' | 'no-orders' | 'high-value' | 'recent';
  sort?: 'newest' | 'oldest' | 'highest-spent' | 'most-orders' | 'recent-order';
  page?: number;
  limit?: number;
}

export interface CustomerListMetrics {
  totalCustomers: number;
  totalSpent: number;
  avgCustomerValue: number;
  repeatCustomersCount: number;
}

export interface CustomerListResponse {
  success: boolean;
  customers: AdminCustomerSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  metrics: CustomerListMetrics;
  error?: string;
}

export interface CustomerDetailResponse {
  success: boolean;
  customer?: AdminCustomerDetail;
  error?: string;
}

/**
 * Fetches the paginated list of customers and aggregate metrics from the admin API.
 */
export async function getAdminCustomers(
  params: CustomerQueryParams = {}
): Promise<CustomerListResponse> {
  try {
    if (!isSupabaseConfigured) {
      return {
        success: false,
        customers: [],
        pagination: { page: 1, limit: 25, total: 0, totalPages: 1 },
        metrics: { totalCustomers: 0, totalSpent: 0, avgCustomerValue: 0, repeatCustomersCount: 0 },
        error: 'Database is not configured.',
      };
    }

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      return {
        success: false,
        customers: [],
        pagination: { page: 1, limit: 25, total: 0, totalPages: 1 },
        metrics: { totalCustomers: 0, totalSpent: 0, avgCustomerValue: 0, repeatCustomersCount: 0 },
        error: 'Administrator authentication required.',
      };
    }

    const searchParams = new URLSearchParams();
    if (params.search?.trim()) searchParams.set('search', params.search.trim());
    if (params.filter) searchParams.set('filter', params.filter);
    if (params.sort) searchParams.set('sort', params.sort);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));

    const res = await fetch(`/api/admin/customers?${searchParams.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        customers: [],
        pagination: { page: 1, limit: 25, total: 0, totalPages: 1 },
        metrics: { totalCustomers: 0, totalSpent: 0, avgCustomerValue: 0, repeatCustomersCount: 0 },
        error: data.error || 'Unable to fetch customers.',
      };
    }

    return data;
  } catch (err: any) {
    console.error('Error in getAdminCustomers:', err);
    return {
      success: false,
      customers: [],
      pagination: { page: 1, limit: 25, total: 0, totalPages: 1 },
      metrics: { totalCustomers: 0, totalSpent: 0, avgCustomerValue: 0, repeatCustomersCount: 0 },
      error: err?.message || 'Network error fetching customers.',
    };
  }
}

/**
 * Fetches a single customer's full details and order history.
 */
export async function getAdminCustomerById(
  customerId: string
): Promise<CustomerDetailResponse> {
  try {
    if (!isSupabaseConfigured || !customerId) {
      return { success: false, error: 'Customer ID required.' };
    }

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      return { success: false, error: 'Administrator authentication required.' };
    }

    const res = await fetch(`/api/admin/customers/${encodeURIComponent(customerId)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to fetch customer details.' };
    }

    return data;
  } catch (err: any) {
    console.error('Error in getAdminCustomerById:', err);
    return { success: false, error: err?.message || 'Network error fetching customer details.' };
  }
}

/**
 * Currency formatter for INR with standard Indian numbering system.
 */
export function formatINR(amount: number): string {
  const safeNum = Math.round(Number(amount) || 0);
  return `₹${safeNum.toLocaleString('en-IN')}`;
}

/**
 * Standard date formatter for admin screens.
 */
export function formatCustomerDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}
