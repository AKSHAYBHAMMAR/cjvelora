'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInAdmin, getAdminProfile } from '@/lib/auth';
import { Lock, Mail, ShieldAlert, Sparkles, ArrowRight, Loader2 } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if already authenticated as an admin
  useEffect(() => {
    let isMounted = true;
    async function checkExisting() {
      try {
        const profile = await getAdminProfile();
        if (isMounted && profile) {
          router.replace('/admin');
          return;
        }
      } catch {
        // Continue to login screen
      } finally {
        if (isMounted) setCheckingAuth(false);
      }
    }
    checkExisting();
    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const { profile, error: authError } = await signInAdmin(email, password);
      if (authError || !profile) {
        setError(authError || 'Authentication failed. Please check your credentials.');
        setLoading(false);
        return;
      }

      // Successful admin login -> redirect to dashboard
      router.replace('/admin');
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-soft-gold animate-spin mx-auto" />
          <p className="font-tech text-xs uppercase tracking-[0.25em] text-ivory/60">
            Checking Atelier Credentials...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-charcoal via-[#121415] to-[#0A0C0E] text-ivory flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Ambient background decoration */}
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-soft-gold/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-navy/40 blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/5 border border-soft-gold/30 mb-2">
            <Sparkles className="w-3 h-3 text-soft-gold" />
            <span className="font-tech text-[10px] uppercase tracking-[0.3em] text-soft-gold font-medium">
              Atelier Console
            </span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-white">
            VELORA
          </h1>
          <p className="font-sans text-xs uppercase tracking-widest text-ivory/60 font-medium">
            Administrator Portal
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-white/[0.04] backdrop-blur-xl py-8 px-6 sm:px-10 rounded-3xl border border-white/10 shadow-2xl space-y-6">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 animate-fade-in">
              <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-rose-200 leading-relaxed">
                {error}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block font-tech text-xs uppercase tracking-wider text-ivory/80 font-medium mb-2"
              >
                Admin Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="w-4 h-4 text-ivory/40" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@velora.com"
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-ivory placeholder-ivory/30 focus:outline-none focus:border-soft-gold focus:ring-1 focus:ring-soft-gold text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block font-tech text-xs uppercase tracking-wider text-ivory/80 font-medium mb-2"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4 text-ivory/40" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-ivory placeholder-ivory/30 focus:outline-none focus:border-soft-gold focus:ring-1 focus:ring-soft-gold text-sm transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-soft-gold to-[#B8860B] hover:from-[#E5C158] hover:to-[#D4AF37] text-charcoal font-sans text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2 shadow-luxury transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Authorization...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Atelier Console</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-white/5 text-center">
            <p className="font-tech text-[11px] text-ivory/40">
              Restricted area. Authorized personnel only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
