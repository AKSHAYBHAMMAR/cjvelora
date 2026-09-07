'use client';

import React, { FormEvent, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, LockKeyhole, Mail, UserRound, Phone, Eye, EyeOff } from 'lucide-react';
import { signUpCustomer, signInWithGoogle, sanitizeRedirectUrl } from '@/lib/auth';
import PhoneAuthFlow from '@/components/auth/PhoneAuthFlow';
import EmailVerificationNotice from '@/components/auth/EmailVerificationNotice';

function GoogleIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#EA4335"
        d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
      />
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
      />
      <path
        fill="#FBBC05"
        d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8 0-1.3.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
      />
      <path
        fill="#34A853"
        d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
      />
    </svg>
  );
}

function CustomerRegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get('next') || '/account/orders';
  const next = sanitizeRedirectUrl(rawNext, '/account/orders');

  const [authMethod, setAuthMethod] = useState<'options' | 'phone'>('options');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);

  const handleEmailSignUp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const result = await signUpCustomer(fullName, email, password, next);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.needsEmailConfirmation) {
      setNeedsVerification(true);
      return;
    }

    // Direct active session
    router.push(next);
    router.refresh();
  };

  const handleGoogleSignUp = async () => {
    setError(null);
    setGoogleLoading(true);
    const result = await signInWithGoogle(next);
    if (result.error) {
      setError(result.error);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <Link
        href="/"
        className="inline-flex items-center text-xs uppercase tracking-widest text-white/50 hover:text-[#d4af37] mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Boutique
      </Link>

      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-7 sm:p-9 shadow-2xl">
        {needsVerification ? (
          <EmailVerificationNotice
            email={email}
            nextUrl={next}
            onBackToSignIn={() => router.push(`/customer/login?next=${encodeURIComponent(next)}`)}
          />
        ) : authMethod === 'phone' ? (
          <div>
            <div className="text-center mb-6">
              <p className="text-xs uppercase tracking-[0.3em] text-[#d4af37]">CJVELORA</p>
              <h1 className="font-serif text-3xl mt-2 text-white">Phone Sign Up</h1>
              <p className="text-sm text-white/50 mt-2">Instant, passwordless registration via SMS.</p>
            </div>
            <PhoneAuthFlow
              nextUrl={next}
              onCancel={() => setAuthMethod('options')}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center mb-6">
              <p className="text-xs uppercase tracking-[0.3em] text-[#d4af37]">CJVELORA</p>
              <h1 className="font-serif text-3xl mt-2 text-white">Create Account</h1>
              <p className="text-sm text-white/50 mt-2">Join our private clientele for bespoke crochet luxury.</p>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300 animate-fade-in">
                {error}
              </div>
            )}

            {/* Quick Multi-Method Action Buttons */}
            <div className="space-y-3">
              {/* Continue with Google */}
              <button
                type="button"
                onClick={handleGoogleSignUp}
                disabled={googleLoading || loading}
                className="w-full rounded-xl border border-white/15 bg-white/5 py-3 px-4 text-xs font-medium uppercase tracking-wider text-white hover:bg-white/10 hover:border-white/30 disabled:opacity-50 transition-all flex items-center justify-center gap-3 cursor-pointer shadow-sm"
              >
                {googleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#d4af37]" />
                ) : (
                  <GoogleIcon className="w-4 h-4" />
                )}
                <span>Continue with Google</span>
              </button>

              {/* Continue with Phone */}
              <button
                type="button"
                onClick={() => setAuthMethod('phone')}
                disabled={googleLoading || loading}
                className="w-full rounded-xl border border-white/15 bg-white/5 py-3 px-4 text-xs font-medium uppercase tracking-wider text-white hover:bg-white/10 hover:border-white/30 disabled:opacity-50 transition-all flex items-center justify-center gap-3 cursor-pointer shadow-sm"
              >
                <Phone className="w-4 h-4 text-[#d4af37]" />
                <span>Continue with Phone</span>
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4 my-2">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">Or email</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Registration Form */}
            <form onSubmit={handleEmailSignUp} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">Full Name</label>
                <div className="relative">
                  <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder-white/25 outline-none focus:border-[#d4af37]"
                    placeholder="Your full name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder-white/25 outline-none focus:border-[#d4af37]"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">Password</label>
                <div className="relative">
                  <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-11 text-sm text-white placeholder-white/25 outline-none focus:border-[#d4af37]"
                    placeholder="At least 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">Confirm Password</label>
                <div className="relative">
                  <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-11 text-sm text-white placeholder-white/25 outline-none focus:border-[#d4af37]"
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full rounded-xl bg-[#d4af37] py-3.5 text-xs font-semibold uppercase tracking-widest text-black hover:bg-[#e5c158] disabled:opacity-60 transition-colors shadow-md cursor-pointer mt-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> Creating Account...
                  </span>
                ) : (
                  'Create Customer Account'
                )}
              </button>
            </form>

            <div className="pt-5 border-t border-white/10 text-center text-sm text-white/50">
              Already have an account?{' '}
              <Link
                href={`/customer/login?next=${encodeURIComponent(next)}`}
                className="text-[#d4af37] hover:underline font-medium"
              >
                Sign in
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CustomerRegisterPage() {
  return (
    <main className="min-h-screen bg-[#0a0e14] text-white flex items-center justify-center px-4 py-20">
      <Suspense
        fallback={
          <div className="flex items-center justify-center text-white">
            <Loader2 className="w-8 h-8 animate-spin text-[#d4af37]" />
          </div>
        }
      >
        <CustomerRegisterForm />
      </Suspense>
    </main>
  );
}
