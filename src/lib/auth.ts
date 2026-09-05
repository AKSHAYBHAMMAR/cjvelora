import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export type AdminRole = 'super_admin' | 'staff';

export interface AdminProfile {
  id: string;
  email: string;
  role: AdminRole;
}

export interface CustomerProfile {
  id: string;
  email: string;
  fullName: string;
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
    if (!isSupabaseConfigured) return null;

    const { data, error } = await supabase
      .from('admin_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data && isValidAdminRole(data.role)) {
      return data.role.toLowerCase().trim() as AdminRole;
    }

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

export async function getAdminProfile(): Promise<AdminProfile | null> {
  try {
    if (!isSupabaseConfigured) return null;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return null;

    const role = await verifyAdminRole(user.id, user.email);
    if (!role) return null;

    return { id: user.id, email: user.email || '', role };
  } catch (err) {
    console.error('Error fetching admin profile:', err);
    return null;
  }
}

export async function signInAdmin(
  email: string,
  password: string
): Promise<{ profile: AdminProfile | null; error: string | null }> {
  try {
    if (!isSupabaseConfigured) {
      return { profile: null, error: 'Supabase is not configured. Please check your environment variables.' };
    }

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError || !data.user) {
      return { profile: null, error: signInError?.message || 'Invalid email or password.' };
    }

    const role = await verifyAdminRole(data.user.id, data.user.email);
    if (!role) {
      await supabase.auth.signOut();
      return { profile: null, error: 'Access denied: You do not have administrator permissions.' };
    }

    return {
      profile: { id: data.user.id, email: data.user.email || email, role },
      error: null,
    };
  } catch (err: any) {
    return { profile: null, error: err?.message || 'An unexpected error occurred during login.' };
  }
}

/**
 * Customer sign-in is deliberately separate from the admin flow.
 * An account with an admin role cannot use this customer login.
 */
export async function signInCustomer(
  email: string,
  password: string
): Promise<{ profile: CustomerProfile | null; error: string | null }> {
  try {
    if (!isSupabaseConfigured) {
      return { profile: null, error: 'Supabase is not configured. Please check your environment variables.' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data.user) {
      return { profile: null, error: error?.message || 'Invalid email or password.' };
    }

    const adminRole = await verifyAdminRole(data.user.id, data.user.email);
    if (adminRole) {
      await supabase.auth.signOut();
      return { profile: null, error: 'This account is an administrator. Please use the administrator sign-in page.' };
    }

    return {
      profile: {
        id: data.user.id,
        email: data.user.email || email.trim(),
        fullName: String(data.user.user_metadata?.full_name || '').trim(),
      },
      error: null,
    };
  } catch (err: any) {
    return { profile: null, error: err?.message || 'An unexpected error occurred during login.' };
  }
}

export async function signUpCustomer(
  fullName: string,
  email: string,
  password: string
): Promise<{ profile: CustomerProfile | null; needsEmailConfirmation: boolean; error: string | null }> {
  try {
    if (!isSupabaseConfigured) {
      return { profile: null, needsEmailConfirmation: false, error: 'Supabase is not configured. Please check your environment variables.' };
    }

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) return { profile: null, needsEmailConfirmation: false, error: 'Please enter your full name.' };
    if (password.length < 8) return { profile: null, needsEmailConfirmation: false, error: 'Password must be at least 8 characters.' };

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: { data: { full_name: cleanName } },
    });

    if (error || !data.user) {
      return { profile: null, needsEmailConfirmation: false, error: error?.message || 'Unable to create your account.' };
    }

    const adminRole = await verifyAdminRole(data.user.id, data.user.email);
    if (adminRole) {
      await supabase.auth.signOut();
      return { profile: null, needsEmailConfirmation: false, error: 'This email is reserved for administrator access.' };
    }

    const needsEmailConfirmation = !data.session;
    return {
      profile: {
        id: data.user.id,
        email: data.user.email || cleanEmail,
        fullName: cleanName,
      },
      needsEmailConfirmation,
      error: null,
    };
  } catch (err: any) {
    return { profile: null, needsEmailConfirmation: false, error: err?.message || 'An unexpected error occurred during registration.' };
  }
}

export async function getCustomerProfile(): Promise<CustomerProfile | null> {
  try {
    if (!isSupabaseConfigured) return null;

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    const adminRole = await verifyAdminRole(user.id, user.email);
    if (adminRole) return null;

    return {
      id: user.id,
      email: user.email || '',
      fullName: String(user.user_metadata?.full_name || '').trim(),
    };
  } catch (err) {
    console.error('Error fetching customer profile:', err);
    return null;
  }
}

export async function signOutCustomer(): Promise<void> {
  try {
    if (isSupabaseConfigured) await supabase.auth.signOut();
  } catch (err) {
    console.error('Error signing out customer:', err);
  }
}

export async function signOutAdmin(): Promise<void> {
  try {
    if (isSupabaseConfigured) await supabase.auth.signOut();
  } catch (err) {
    console.error('Error signing out admin:', err);
  }
}
