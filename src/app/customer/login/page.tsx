'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, LockKeyhole, Mail } from 'lucide-react';
import { signInCustomer } from '@/lib/auth';

export default function CustomerLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/account';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);
    const result = await signInCustomer(email, password);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push(next.startsWith('/') ? next : '/account');
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#0a0e14] text-white flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center text-xs uppercase tracking-widest text-white/50 hover:text-[#d4af37] mb-10 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Boutique
        </Link>
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-7 sm:p-9 shadow-2xl">
          <div className="text-center mb-8">
            <p className="text-xs uppercase tracking-[0.3em] text-[#d4af37]">CJVELORA</p>
            <h1 className="font-serif text-3xl mt-2">Welcome Back</h1>
            <p className="text-sm text-white/50 mt-3">Sign in to your customer account.</p>
          </div>

          {error && <div className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm outline-none focus:border-[#d4af37]" placeholder="you@example.com" />
              </div>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">Password</label>
              <div className="relative">
                <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm outline-none focus:border-[#d4af37]" placeholder="Your password" />
              </div>
            </div>
            <div className="flex justify-end">
              <Link href="/customer/forgot-password" className="text-xs text-[#d4af37] hover:underline">Forgot password?</Link>
            </div>
            <button disabled={loading} className="w-full rounded-xl bg-[#d4af37] py-3.5 text-xs font-semibold uppercase tracking-widest text-black hover:bg-[#e5c158] disabled:opacity-60 transition-colors">
              {loading ? <span className="flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Signing In</span> : 'Sign In'}
            </button>
          </form>

          <div className="mt-7 pt-6 border-t border-white/10 text-center text-sm text-white/50">
            New to CJVELORA? <Link href={`/customer/register?next=${encodeURIComponent(next)}`} className="text-[#d4af37] hover:underline">Create an account</Link>
          </div>
          <Link href="/admin/login" className="block text-center text-[10px] uppercase tracking-widest text-white/25 hover:text-white/50 mt-6">Administrator access</Link>
        </div>
      </div>
    </main>
  );
}
