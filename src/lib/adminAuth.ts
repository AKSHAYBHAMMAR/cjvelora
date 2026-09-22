import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabase as defaultSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { verifyAdminRole, AdminProfile } from '@/lib/auth';

/**
 * Creates a Supabase client scoped to the authenticated admin's session.
 * Passes the user's Bearer JWT in the global Authorization header so that
 * PostgREST / PostgreSQL resolves auth.uid() to this administrator for all
 * Row Level Security (RLS) policies.
 */
export function createAuthenticatedAdminClient(token: string): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export interface AuthenticatedAdminResult {
  admin: AdminProfile | null;
  adminProfile: AdminProfile | null;
  supabase: SupabaseClient | null;
  token: string | null;
  error: string | null;
  status: number;
}

/**
 * Shared authentication and authorization middleware for all /api/admin/* endpoints.
 * 1. Checks that database configuration is available.
 * 2. Extracts and validates the Bearer access token from the Authorization header.
 * 3. Verifies the authenticated user against public.admin_roles ('super_admin' or 'staff').
 * 4. Returns an authenticated Supabase client carrying the user's session context so auth.uid()
 *    is preserved for all subsequent database queries under RLS.
 */
export async function authenticateAdmin(req: NextRequest): Promise<AuthenticatedAdminResult> {
  if (!isSupabaseConfigured) {
    return {
      admin: null,
      adminProfile: null,
      supabase: null,
      token: null,
      error: 'Database is not configured in the environment.',
      status: 503,
    };
  }

  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return {
      admin: null,
      adminProfile: null,
      supabase: null,
      token: null,
      error: 'Unauthorized: Missing authentication token.',
      status: 401,
    };
  }

  const {
    data: { user },
    error: authError,
  } = await defaultSupabase.auth.getUser(token);

  if (authError || !user) {
    return {
      admin: null,
      adminProfile: null,
      supabase: null,
      token: null,
      error: 'Unauthorized: Invalid or expired administrator session.',
      status: 401,
    };
  }

  const role = await verifyAdminRole(user.id, user.email);
  if (!role) {
    return {
      admin: null,
      adminProfile: null,
      supabase: null,
      token: null,
      error: 'Forbidden: Administrator privileges required.',
      status: 403,
    };
  }

  const adminProfile: AdminProfile = {
    id: user.id,
    email: user.email || '',
    role,
  };

  const adminClient = createAuthenticatedAdminClient(token);

  return {
    admin: adminProfile,
    adminProfile,
    supabase: adminClient,
    token,
    error: null,
    status: 200,
  };
}
