import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  AnalyticsTimeframe,
  AnalyticsApiResponse,
} from '@/types/analytics';

/**
 * Currency formatter for INR with standard Indian numbering convention (e.g. ₹1,24,500).
 */
export function formatINR(amount: number): string {
  const safe = Math.round(Number(amount) || 0);
  return `₹${safe.toLocaleString('en-IN')}`;
}

/**
 * Formats a percentage change for display.
 * Returns null if change cannot be calculated reliably.
 */
export function formatPercentChange(change: number | null): {
  formatted: string;
  isPositive: boolean;
  isNegative: boolean;
  isNeutral: boolean;
} | null {
  if (change === null || change === undefined || !isFinite(change)) {
    return null;
  }
  const isPositive = change > 0;
  const isNegative = change < 0;
  const isNeutral = change === 0;
  const prefix = isPositive ? '+' : '';
  return {
    formatted: `${prefix}${change.toFixed(1)}%`,
    isPositive,
    isNegative,
    isNeutral,
  };
}

/**
 * Fetch analytics data from `/api/admin/analytics` with the admin session JWT.
 */
export async function getAdminAnalytics(params: {
  timeframe: AnalyticsTimeframe;
  startDate?: string;
  endDate?: string;
}): Promise<AnalyticsApiResponse> {
  try {
    if (!isSupabaseConfigured) {
      return {
        success: false,
        error: 'Database is not configured in the current environment.',
      };
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const token = session?.access_token;
    if (!token) {
      return {
        success: false,
        error: 'Administrator authentication required. Please sign in.',
      };
    }

    const searchParams = new URLSearchParams();
    searchParams.set('timeframe', params.timeframe);
    if (params.startDate) searchParams.set('startDate', params.startDate);
    if (params.endDate) searchParams.set('endDate', params.endDate);

    const res = await fetch(`/api/admin/analytics?${searchParams.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Failed to retrieve analytics data.',
      };
    }

    return data;
  } catch (err: any) {
    console.error('Error fetching admin analytics:', err);
    return {
      success: false,
      error: err?.message || 'Network error while contacting analytics service.',
    };
  }
}
