'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MailCheck, RefreshCw, Loader2, ArrowLeft, ExternalLink } from 'lucide-react';
import { resendEmailVerification } from '@/lib/auth';

interface EmailVerificationNoticeProps {
  email: string;
  nextUrl?: string;
  onBackToSignIn?: () => void;
}

function getEmailProviderUrl(email: string): { url: string; isWebmail: boolean } {
  const domain = (email.split('@')[1] || '').toLowerCase().trim();
  if (domain.includes('gmail.com') || domain.includes('googlemail.com')) {
    return { url: 'https://mail.google.com', isWebmail: true };
  }
  if (domain.includes('outlook.com') || domain.includes('hotmail.com') || domain.includes('live.com')) {
    return { url: 'https://outlook.live.com/mail', isWebmail: true };
  }
  if (domain.includes('yahoo.com') || domain.includes('ymail.com')) {
    return { url: 'https://mail.yahoo.com', isWebmail: true };
  }
  if (domain.includes('icloud.com') || domain.includes('me.com')) {
    return { url: 'https://www.icloud.com/mail', isWebmail: true };
  }
  if (domain.includes('proton.me') || domain.includes('protonmail.com')) {
    return { url: 'https://mail.proton.me', isWebmail: true };
  }
  return { url: 'mailto:', isWebmail: false };
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

  const { url: emailServiceUrl } = getEmailProviderUrl(email);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

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
      setMessage('A fresh verification link has been sent to your inbox.');
      setCooldown(60);
    }
  };

  return (
    <div className="space-y-6 text-center animate-fade-in py-2">
      {/* Brand Icon */}
      <div className="w-16 h-16 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/35 flex items-center justify-center mx-auto text-[#d4af37] shadow-lg shadow-[#d4af37]/5">
        <MailCheck className="w-8 h-8" />
      </div>

      {/* Brand & Main Headings */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.35em] text-[#d4af37] font-semibold">CJVELORA</p>
        <h2 className="font-serif text-2xl sm:text-3xl text-white">Check your inbox</h2>
        <p className="text-xs sm:text-sm text-white/70 font-medium">You&apos;re almost there.</p>
      </div>

      {/* Recipient Notice */}
      <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4 max-w-sm mx-auto space-y-1.5">
        <p className="text-xs text-white/60">We&apos;ve sent a verification link to</p>
        <p className="text-sm text-white font-mono font-medium break-all select-all">{email}</p>
        <p className="text-xs text-white/70 pt-2 border-t border-white/10 mt-2 leading-relaxed">
          Verify your email address to activate your CJVELORA account.
        </p>
      </div>

      {/* Status feedback */}
      {message && (
        <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300">
          {message}
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* Primary Action: Open Email */}
      <div className="pt-2">
        <a
          href={emailServiceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#d4af37] py-3.5 px-6 text-xs font-semibold uppercase tracking-widest text-black hover:bg-[#e5c158] transition-colors shadow-md cursor-pointer"
        >
          <span>Open Email</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-80" />
        </a>
      </div>

      {/* Secondary Action: Resend with 60s cooldown */}
      <div className="pt-1 space-y-3">
        <div className="flex items-center justify-center text-xs text-white/60 gap-2">
          <span>Didn&apos;t receive the email?</span>
          {cooldown > 0 ? (
            <span className="text-[#d4af37] font-mono text-xs">Resend in {cooldown}s</span>
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
              <span>Resend verification email</span>
            </button>
          )}
        </div>

        <p className="text-[11px] text-white/45">
          Check your spam or promotions folder.
        </p>
      </div>

      {/* Back to Sign In */}
      <div className="pt-4 border-t border-white/10">
        {onBackToSignIn ? (
          <button
            type="button"
            onClick={onBackToSignIn}
            className="inline-flex items-center text-xs uppercase tracking-widest text-white/60 hover:text-[#d4af37] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Sign In
          </button>
        ) : (
          <Link
            href="/customer/login"
            className="inline-flex items-center text-xs uppercase tracking-widest text-white/60 hover:text-[#d4af37] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Sign In
          </Link>
        )}
      </div>
    </div>
  );
}
