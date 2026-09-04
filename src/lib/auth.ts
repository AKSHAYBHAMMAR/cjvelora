import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export type AdminRole = 'super_admin' | 'staff';

export interface AdminProfile {
  id: string;
  email: string;
  role: AdminRole;
}

/**
 * Validates whether a given role string is an authorized admin role.
 */
export function isValidAdminRole(role: string | null | undefined): role is AdminRole {
  if (!role) return false;
  const normalized = role.toLowerCase().trim();
  return normalized === 'super_admin' || normalized === 'staff';
}

/**
 * Checks the `admin_roles` table in Supabase for the current user.
 * Returns the admin role if authorized, or null if unauthorized.
 */
export async function verifyAdminRole(userId: string, userEmail?: string | null): Promise<AdminRole | null> {
  try {
    if (!isSupabaseConfigured) {
      return null;
    }

    // 1. Query admin_roles by user_id
    const { data, error } = await supabase
      .from('admin_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data && isValidAdminRole(data.role)) {
      return data.role.toLowerCase().trim() as AdminRole;
    }

    // 2. Fallback query by email if user_id was not matched
    if (userEmail) {
      const { data: emailData, error: emailError } = await supabase
        .from('admin_roles')
        .select('role')
        .eq('email', userEmail)
        .maybeSingle();

      if (!emailError && emailData && isValidAdminRole(emailData.role)) {
        return emailData.role.toLowerCase().trim() as AdminRole;
      }
    }

    return null;
  } catch (err) {
    console.error('Error verifying admin authorization:', err);
    return null;
  }
}

/**
 * Fetches the currently authenticated Supabase user and verifies their admin role.
 */
export async function getAdminProfile(): Promise<AdminProfile | null> {
  try {
    if (!isSupabaseConfigured) {
      return null;
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return null;
    }

    const role = await verifyAdminRole(user.id, user.email);
    if (!role) {
      return null;
    }

    return {
      id: user.id,
      email: user.email || '',
      role,
    };
  } catch (err) {
    console.error('Error fetching admin profile:', err);
    return null;
  }
}

/**
 * Authenticates an admin using Supabase Auth email/password,
 * then strictly enforces admin role verification against `admin_roles`.
 */
export async function signInAdmin(
  email: string,
  password: string
): Promise<{ profile: AdminProfile | null; error: string | null }> {
  try {
    if (!isSupabaseConfigured) {
      return {
        profile: null,
        error: 'Supabase is not configured. Please check your environment variables.',
      };
    }

    // 1. Supabase Auth authentication
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError || !data.user) {
      return {
        profile: null,
        error: signInError?.message || 'Invalid email or password.',
      };
    }

    // 2. Strictly check admin authorization
    const role = await verifyAdminRole(data.user.id, data.user.email);
    if (!role) {
      // User is authenticated but NOT an admin — revoke session immediately
      await supabase.auth.signOut();
      return {
        profile: null,
        error: 'Access denied: You do not have administrator permissions.',
      };
    }

    return {
      profile: {
        id: data.user.id,
        email: data.user.email || email,
        role,
      },
      error: null,
    };
  } catch (err: any) {
    return {
      profile: null,
      error: err?.message || 'An unexpected error occurred during login.',
    };
  }
}

/**
 * Signs out the current admin.
 */
export async function signOutAdmin(): Promise<void> {
  try {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
  } catch (err) {
    console.error('Error signing out admin:', err);
  }
}
