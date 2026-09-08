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
  phone?: string;
  avatarUrl?: string;
  provider?: string;
}

/**
 * Validates and sanitizes internal redirect URLs to prevent open-redirect vulnerabilities.
 */
export function sanitizeRedirectUrl(url: string | null | undefined, defaultUrl = '/account/orders'): string {
  if (!url) return defaultUrl;
  const trimmed = url.trim();
  // Must start with '/' but NOT '//' or '/\' to prevent protocol-relative redirects
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.startsWith('/\\')) {
    return trimmed;
  }
  return defaultUrl;
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
 * Initiates Google OAuth authentication for customers.
 * Uses clean redirectTo matching Supabase's configured redirect URL whitelist,
 * while preserving the intended next destination in sessionStorage.
 */
export async function signInWithGoogle(nextUrl = '/account/orders'): Promise<{ error: string | null }> {
  try {
    if (!isSupabaseConfigured) {
      return { error: 'Authentication service is not configured.' };
    }

    const cleanNext = sanitizeRedirectUrl(nextUrl, '/account/orders');
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('velora_auth_next', cleanNext);
      } catch {
        // Ignore storage errors in restricted browser modes
      }
    }

    const origin =
      typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : 'https://cjvelora.vercel.app';
    const redirectTo = `${origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    });

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (err: any) {
    return { error: err?.message || 'Failed to initialize Google authentication.' };
  }
}

/**
 * Sends a 6-digit SMS OTP to a customer phone number in E.164 format.
 */
export async function sendPhoneOtp(phoneNumber: string): Promise<{ error: string | null }> {
  try {
    if (!isSupabaseConfigured) {
      return { error: 'Authentication service is not configured.' };
    }

    const cleanPhone = phoneNumber.trim().replace(/\s+/g, '');
    if (!cleanPhone.startsWith('+') || cleanPhone.length < 9) {
      return { error: 'Please enter a valid phone number with country code.' };
    }

    const { error } = await supabase.auth.signInWithOtp({
      phone: cleanPhone,
      options: {
        shouldCreateUser: true,
      },
    });

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (err: any) {
    return { error: err?.message || 'Failed to send OTP.' };
  }
}

/**
 * Verifies the 6-digit SMS OTP token for customer sign-in.
 */
export async function verifyPhoneOtp(
  phoneNumber: string,
  token: string
): Promise<{ profile: CustomerProfile | null; error: string | null }> {
  try {
    if (!isSupabaseConfigured) {
      return { profile: null, error: 'Authentication service is not configured.' };
    }

    const cleanPhone = phoneNumber.trim().replace(/\s+/g, '');
    const cleanToken = token.trim();

    if (cleanToken.length !== 6) {
      return { profile: null, error: 'Please enter the 6-digit verification code.' };
    }

    const { data, error } = await supabase.auth.verifyOtp({
      phone: cleanPhone,
      token: cleanToken,
      type: 'sms',
    });

    if (error || !data.user) {
      return { profile: null, error: error?.message || 'Invalid or expired verification code.' };
    }

    // Ensure phone auth cannot be used to usurp admin accounts
    const adminRole = await verifyAdminRole(data.user.id, data.user.email);
    if (adminRole) {
      await supabase.auth.signOut();
      return { profile: null, error: 'This credential belongs to an administrator account.' };
    }

    return {
      profile: {
        id: data.user.id,
        email: data.user.email || '',
        phone: data.user.phone || cleanPhone,
        fullName: String(data.user.user_metadata?.full_name || 'Client').trim(),
        provider: 'phone',
      },
      error: null,
    };
  } catch (err: any) {
    return { profile: null, error: err?.message || 'An unexpected error occurred during verification.' };
  }
}

/**
 * Customer email + password sign-in.
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
        phone: data.user.phone,
        fullName: String(data.user.user_metadata?.full_name || '').trim(),
        avatarUrl: data.user.user_metadata?.avatar_url,
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
  password: string,
  nextUrl = '/account/orders'
): Promise<{ profile: CustomerProfile | null; needsEmailConfirmation: boolean; error: string | null }> {
  try {
    if (!isSupabaseConfigured) {
      return { profile: null, needsEmailConfirmation: false, error: 'Supabase is not configured. Please check your environment variables.' };
    }

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) return { profile: null, needsEmailConfirmation: false, error: 'Please enter your full name.' };
    if (password.length < 8) return { profile: null, needsEmailConfirmation: false, error: 'Password must be at least 8 characters.' };

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const cleanNext = sanitizeRedirectUrl(nextUrl, '/account/orders');
    const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(cleanNext)}`;

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: { full_name: cleanName },
        emailRedirectTo,
      },
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
        phone: data.user.phone,
        fullName: cleanName,
      },
      needsEmailConfirmation,
      error: null,
    };
  } catch (err: any) {
    return { profile: null, needsEmailConfirmation: false, error: err?.message || 'An unexpected error occurred during registration.' };
  }
}

/**
 * Resends confirmation email for unverified customer signup.
 */
export async function resendEmailVerification(email: string, nextUrl = '/account/orders'): Promise<{ error: string | null }> {
  try {
    if (!isSupabaseConfigured) return { error: 'Authentication service is not configured.' };

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const cleanNext = sanitizeRedirectUrl(nextUrl, '/account/orders');
    const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(cleanNext)}`;

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo },
    });

    if (error) {
      return { error: error.message };
    }
    return { error: null };
  } catch (err: any) {
    return { error: err?.message || 'Failed to resend confirmation email.' };
  }
}

/**
 * Sends a password reset link to the customer's email.
 */
export async function resetPasswordForEmail(email: string): Promise<{ error: string | null }> {
  try {
    if (!isSupabaseConfigured) return { error: 'Authentication service is not configured.' };

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const redirectTo = `${origin}/customer/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo,
    });

    if (error) {
      return { error: error.message };
    }
    return { error: null };
  } catch (err: any) {
    return { error: err?.message || 'Failed to send reset link.' };
  }
}

/**
 * Updates customer's password during reset password flow.
 */
export async function updateCustomerPassword(newPassword: string): Promise<{ error: string | null }> {
  try {
    if (!isSupabaseConfigured) return { error: 'Authentication service is not configured.' };
    if (newPassword.length < 8) return { error: 'Password must be at least 8 characters long.' };

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { error: error.message };
    }
    return { error: null };
  } catch (err: any) {
    return { error: err?.message || 'Failed to update password.' };
  }
}

export async function getCustomerProfile(): Promise<CustomerProfile | null> {
  try {
    if (!isSupabaseConfigured) return null;

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    const adminRole = await verifyAdminRole(user.id, user.email);
    if (adminRole) return null;

    const provider = user.app_metadata?.provider || (user.phone ? 'phone' : 'email');

    return {
      id: user.id,
      email: user.email || '',
      phone: user.phone,
      fullName: String(
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        (user.phone ? `Client (${user.phone.slice(-4)})` : 'Client')
      ).trim(),
      avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture,
      provider,
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
