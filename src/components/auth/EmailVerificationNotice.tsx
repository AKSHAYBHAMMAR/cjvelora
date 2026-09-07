'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MailCheck, RefreshCw, Loader2, ArrowLeft } from 'lucide-react';
import { resendEmailVerification } from '@/lib/auth';

interface EmailVerificationNoticeProps {
  email: string;
  nextUrl?: string;
  onBackToSignIn?: () => void;
}

export default function EmailVerificationNotice({
  email,
  nextUrl = '/account/orders',
  onBackToSignIn,
}: EmailVerificationNoticeProps) {
  const [cooldown, setCooldown] = useState(60);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const maskEmail = (val: string) => {
    if (!val) return '';
    const [user, domain] = val.split('@');
    if (!domain) return val;
    const visibleUser = user.length > 2 ? `${user.slice(0, 2)}****` : `${user}****`;
    return `${visibleUser}@${domain}`;
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setError(null);
    setMessage(null);
    setResending(true);

    const result = await resendEmailVerification(email, nextUrl);
    setResending(false);

    if (result.error) {
      setError(result.error);
    } else {
      setMessage('A new verification email has been sent to your inbox.');
      setCooldown(60);
    }
  };

  return (
    <div className="space-y-6 text-center animate-fade-in py-2">
      <div className="w-16 h-16 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/35 flex items-center justify-center mx-auto text-[#d4af37]">
        <MailCheck className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h2 className="font-serif text-2xl sm:text-3xl text-white">Check Your Inbox</h2>
        <p className="text-xs text-white/60 max-w-sm mx-auto leading-relaxed">
          We have sent a verification link to{' '}
          <strong className="text-white font-mono">{maskEmail(email)}</strong>. Please click the link to activate your CJVELORA customer account.
        </p>
      </div>

      {message && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
          {error}
        </div>
      )}

      <div className="pt-2 space-y-3">
        <div className="flex items-center justify-center text-xs text-white/50 gap-2">
          <span>Didn&apos;t receive the email?</span>
          {cooldown > 0 ? (
            <span className="text-[#d4af37] font-mono">Resend in {cooldown}s</span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="inline-flex items-center gap-1.5 text-[#d4af37] hover:underline cursor-pointer font-medium disabled:opacity-50"
            >
              {resending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span>Resend Verification</span>
            </button>
          )}
        </div>

        <p className="text-[11px] text-white/40">
          Be sure to check your spam, updates, or promotions folder if it doesn&apos;t appear shortly.
        </p>
      </div>

      <div className="pt-4 border-t border-white/10">
        {onBackToSignIn ? (
          <button
            type="button"
            onClick={onBackToSignIn}
            className="inline-flex items-center text-xs uppercase tracking-widest text-white/60 hover:text-[#d4af37] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Return to Sign In
          </button>
        ) : (
          <Link
            href="/customer/login"
            className="inline-flex items-center text-xs uppercase tracking-widest text-white/60 hover:text-[#d4af37] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Return to Sign In
          </Link>
        )}
      </div>
    </div>
  );
}
