'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Mail } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured. Please check your environment variables.');
      return;
    }
    setLoading(true);
    const origin = window.location.origin;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${origin}/customer/reset-password`,
    });
    if (resetError) setError(resetError.message);
    else setMessage('If an account exists for this email, you will receive a password reset link shortly.');
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#0a0e14] text-white flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">
        <Link href="/customer/login" className="inline-flex items-center text-xs uppercase tracking-widest text-white/50 hover:text-[#d4af37] mb-10 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Sign In
        </Link>
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-7 sm:p-9 shadow-2xl">
          <div className="text-center mb-8">
            <p className="text-xs uppercase tracking-[0.3em] text-[#d4af37]">CJVELORA</p>
            <h1 className="font-serif text-3xl mt-2">Reset Password</h1>
            <p className="text-sm text-white/50 mt-3">Enter your email and we&apos;ll send you a secure reset link.</p>
          </div>
          {error && <div className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>}
          {message && <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{message}</div>}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm outline-none focus:border-[#d4af37]" placeholder="you@example.com" />
            </div>
            <button disabled={loading} className="w-full rounded-xl bg-[#d4af37] py-3.5 text-xs font-semibold uppercase tracking-widest text-black hover:bg-[#e5c158] disabled:opacity-60 transition-colors">
              {loading ? <span className="flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending</span> : 'Send Reset Link'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
