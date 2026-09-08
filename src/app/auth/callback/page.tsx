'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { verifyAdminRole, sanitizeRedirectUrl } from '@/lib/auth';

function AuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function processCallback() {
      try {
        // 1. Check for errors passed in query parameters
        const queryError = searchParams.get('error');
        const queryErrorDesc = searchParams.get('error_description');

        if (queryError || queryErrorDesc) {
          if (isMounted) {
            setStatus('error');
            setErrorMessage(queryErrorDesc || queryError || 'Authentication could not be completed.');
          }
          return;
        }

        // Resolve destination from sessionStorage (set during signInWithGoogle) or query parameters
        let cleanNext = '/account/orders';
        if (typeof window !== 'undefined') {
          try {
            const savedNext = sessionStorage.getItem('velora_auth_next');
            if (savedNext) {
              cleanNext = sanitizeRedirectUrl(savedNext, '/account/orders');
              sessionStorage.removeItem('velora_auth_next');
            } else {
              cleanNext = sanitizeRedirectUrl(searchParams.get('next'), '/account/orders');
            }
          } catch {
            cleanNext = sanitizeRedirectUrl(searchParams.get('next'), '/account/orders');
          }
        }

        // 2. Check existing session first (auto-handled by detectSessionInUrl)
        let { data: { session }, error: sessionError } = await supabase.auth.getSession();

        // If no active session yet and code is present, exchange authorization code
        const code = searchParams.get('code');
        if (!session?.user && code) {
          const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.warn('Notice: Code exchange error:', exchangeError);
          } else if (exchangeData?.session) {
            session = exchangeData.session;
          }
        }

        // 3. Verify active user
        let user = session?.user;
        if (!user) {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          user = currentUser || undefined;
        }

        if (!user) {
          if (isMounted) {
            setStatus('error');
            setErrorMessage('No active authentication session was found. Please try signing in again.');
          }
          return;
        }

        // 4. Security Check: Customers must NEVER be administrators
        const adminRole = await verifyAdminRole(user.id, user.email);
        if (adminRole) {
          await supabase.auth.signOut();
          router.push('/admin/login?error=admin_account_detected');
          return;
        }

        if (isMounted) {
          setStatus('success');
          // Smooth redirect to intended destination
          setTimeout(() => {
            router.push(cleanNext);
            router.refresh();
          }, 800);
        }
      } catch (err: any) {
        console.error('Error handling auth callback:', err);
        if (isMounted) {
          setStatus('error');
          setErrorMessage(err?.message || 'An unexpected error occurred during authentication verification.');
        }
      }
    }

    processCallback();

    return () => {
      isMounted = false;
    };
  }, [router, searchParams]);

  if (status === 'error') {
    return (
      <div className="w-full max-w-md bg-white/[0.03] border border-white/10 rounded-2xl p-8 shadow-2xl text-center space-y-6">
        <div className="w-14 h-14 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h1 className="font-serif text-2xl text-white">Authentication Notice</h1>
          <p className="text-xs text-rose-300 leading-relaxed max-w-sm mx-auto">
            {errorMessage || 'Unable to complete sign-in. Please try again or use another authentication method.'}
          </p>
        </div>
        <Link
          href="/customer/login"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#d4af37] text-black text-xs font-semibold uppercase tracking-widest hover:bg-[#e5c158] transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Sign In</span>
        </Link>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="w-full max-w-md bg-white/[0.03] border border-white/10 rounded-2xl p-8 shadow-2xl text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h1 className="font-serif text-2xl text-white">Welcome Back</h1>
        <p className="text-xs text-white/60">Redirecting to your CJVELORA destination...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-white/[0.03] border border-white/10 rounded-2xl p-8 shadow-2xl text-center space-y-4">
      <Loader2 className="w-8 h-8 animate-spin text-[#d4af37] mx-auto" />
      <h1 className="font-serif text-2xl text-white">Verifying Identity</h1>
      <p className="text-xs text-white/50">Securing your private customer session...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <main className="min-h-screen bg-[#0a0e14] text-white flex items-center justify-center px-4 py-20">
      <Suspense
        fallback={
          <div className="flex items-center justify-center text-white">
            <Loader2 className="w-8 h-8 animate-spin text-[#d4af37]" />
          </div>
        }
      >
        <AuthCallbackHandler />
      </Suspense>
    </main>
  );
}
