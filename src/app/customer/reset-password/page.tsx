'use client';

import React, { useState, FormEvent, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, LockKeyhole, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { updateCustomerPassword } from '@/lib/auth';

function ResetPasswordForm() {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const result = await updateCustomerPassword(password);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      router.push('/customer/login');
    }, 2500);
  };

  return (
    <div className="w-full max-w-md">
      <Link
        href="/customer/login"
        className="inline-flex items-center text-xs uppercase tracking-widest text-white/50 hover:text-[#d4af37] mb-10 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Sign In
      </Link>

      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-7 sm:p-9 shadow-2xl">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[#d4af37]">CJVELORA</p>
          <h1 className="font-serif text-3xl mt-2 text-white">Set New Password</h1>
          <p className="text-sm text-white/50 mt-3">Choose a strong, private password for your account.</p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        {success ? (
          <div className="text-center py-6 space-y-4 animate-scale-in">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="font-serif text-2xl text-white">Password Updated</h3>
            <p className="text-xs text-white/60">Your password has been successfully updated. Redirecting to sign in...</p>
            <div className="pt-2">
              <Link
                href="/customer/login"
                className="inline-block px-6 py-2.5 rounded-xl bg-[#d4af37] text-black text-xs uppercase tracking-widest font-semibold hover:bg-[#e5c158] transition-all"
              >
                Sign In Now
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">New Password</label>
              <div className="relative">
                <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-11 text-sm text-white placeholder-white/25 outline-none focus:border-[#d4af37]"
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
              <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">Confirm New Password</label>
              <div className="relative">
                <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your new password"
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-11 text-sm text-white placeholder-white/25 outline-none focus:border-[#d4af37]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#d4af37] py-3.5 text-xs font-semibold uppercase tracking-widest text-black hover:bg-[#e5c158] disabled:opacity-60 transition-all shadow-md cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Updating Password...
                </span>
              ) : (
                'Save New Password'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-[#0a0e14] text-white flex items-center justify-center px-4 py-20">
      <Suspense
        fallback={
          <div className="flex items-center justify-center text-white">
            <Loader2 className="w-8 h-8 animate-spin text-[#d4af37]" />
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
