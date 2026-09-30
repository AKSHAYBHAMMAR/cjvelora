'use client';

import React, { FormEvent, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Mail, CheckCircle2 } from 'lucide-react';
import { resetPasswordForEmail } from '@/lib/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    const result = await resetPasswordForEmail(cleanEmail);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSent(true);
  };

  return (
    <main className="min-h-screen bg-[#0a0e14] text-white flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">
        <Link
          href="/customer/login"
          className="inline-flex items-center text-xs uppercase tracking-widest text-white/50 hover:text-[#d4af37] mb-8 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d4af37] rounded-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Sign In
        </Link>

        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-7 sm:p-9 shadow-2xl">
          <div className="text-center mb-8">
            <p className="text-xs uppercase tracking-[0.35em] text-[#d4af37] font-semibold">CJVELORA</p>
            <h1 className="font-serif text-3xl mt-2 text-white">Reset Password</h1>
            <p className="text-sm text-white/50 mt-2.5">
              Enter your registered email address to receive a secure recovery link.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300 animate-fade-in"
            >
              {error}
            </div>
          )}

          {sent ? (
            <div className="text-center py-4 space-y-4 animate-scale-in">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h2 className="font-serif text-2xl text-white">Check Your Inbox</h2>
              <p className="text-xs text-white/60 leading-relaxed max-w-sm mx-auto">
                If an account exists for <strong className="text-white font-mono">{email}</strong>, you will receive a password reset link shortly.
              </p>
              <div className="pt-4 border-t border-white/10">
                <Link
                  href="/customer/login"
                  className="inline-flex items-center text-xs uppercase tracking-widest text-[#d4af37] hover:underline focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#d4af37] rounded-sm"
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="forgot-email"
                  className="block text-xs uppercase tracking-wider text-white/60 mb-2"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3.5 pl-11 pr-4 text-sm text-white placeholder-white/25 outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full rounded-xl bg-[#d4af37] py-3.5 text-xs font-semibold uppercase tracking-widest text-black hover:bg-[#e5c158] disabled:opacity-60 transition-all shadow-md cursor-pointer focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending Recovery Link...
                  </span>
                ) : (
                  'Send Recovery Link'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
