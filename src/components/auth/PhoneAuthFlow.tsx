'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, CheckCircle2, ShieldCheck, Smartphone, RefreshCw } from 'lucide-react';
import { sendPhoneOtp, verifyPhoneOtp, sanitizeRedirectUrl } from '@/lib/auth';

interface CountryCode {
  name: string;
  code: string;
  flag: string;
}

const COUNTRY_CODES: CountryCode[] = [
  { name: 'India', code: '+91', flag: '🇮🇳' },
  { name: 'United States / Canada', code: '+1', flag: '🇺🇸' },
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧' },
  { name: 'United Arab Emirates', code: '+971', flag: '🇦🇪' },
  { name: 'Singapore', code: '+65', flag: '🇸🇬' },
  { name: 'Australia', code: '+61', flag: '🇦🇺' },
  { name: 'Germany', code: '+49', flag: '🇩🇪' },
  { name: 'France', code: '+33', flag: '🇫🇷' },
  { name: 'Saudi Arabia', code: '+966', flag: '🇸🇦' },
  { name: 'Japan', code: '+81', flag: '🇯🇵' },
];

interface PhoneAuthFlowProps {
  nextUrl?: string;
  onCancel?: () => void;
}

export default function PhoneAuthFlow({ nextUrl = '/account/orders', onCancel }: PhoneAuthFlowProps) {
  const router = useRouter();
  const cleanNext = sanitizeRedirectUrl(nextUrl, '/account/orders');

  const [step, setStep] = useState<'input' | 'otp' | 'success'>('input');
  const [selectedCountry, setSelectedCountry] = useState('+91');
  const [rawPhone, setRawPhone] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const digitInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown countdown effect
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const fullPhoneNumber = `${selectedCountry}${rawPhone.trim()}`;

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const cleanRaw = rawPhone.replace(/\D/g, '');
    if (cleanRaw.length < 7 || cleanRaw.length > 15) {
      setError('Please enter a valid mobile number.');
      return;
    }

    setLoading(true);
    const result = await sendPhoneOtp(fullPhoneNumber);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setStep('otp');
    setCooldown(60); // 60s cooldown to protect against SMS spam
    setOtpDigits(['', '', '', '', '', '']);
    setTimeout(() => {
      digitInputRefs.current[0]?.focus();
    }, 100);
  };

  const handleResendOtp = async () => {
    if (cooldown > 0 || loading) return;
    setError(null);
    setLoading(true);
    const result = await sendPhoneOtp(fullPhoneNumber);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setCooldown(60);
  };

  const handleDigitChange = (index: number, val: string) => {
    const cleanChar = val.slice(-1).replace(/\D/g, '');
    const newDigits = [...otpDigits];
    newDigits[index] = cleanChar;
    setOtpDigits(newDigits);

    if (cleanChar && index < 5) {
      digitInputRefs.current[index + 1]?.focus();
    }

    // Auto submit if all 6 digits entered
    if (cleanChar && index === 5 && newDigits.every((d) => d !== '')) {
      verifyCode(newDigits.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      digitInputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setOtpDigits(newDigits);

    if (pasted.length === 6) {
      verifyCode(pasted);
    } else {
      digitInputRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  const verifyCode = async (codeToVerify?: string) => {
    const code = codeToVerify || otpDigits.join('');
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code.');
      return;
    }

    setError(null);
    setLoading(true);
    const result = await verifyPhoneOtp(fullPhoneNumber, code);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setStep('success');
    setTimeout(() => {
      router.push(cleanNext);
      router.refresh();
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center text-xs uppercase tracking-widest text-white/50 hover:text-[#d4af37] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
          </button>
        )}
        <div className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-white/40 ml-auto">
          <ShieldCheck className="w-3.5 h-3.5 text-[#d4af37]" />
          <span>Encrypted Phone Auth</span>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300 animate-fade-in">
          {error}
        </div>
      )}

      {/* STEP 1: Phone Input */}
      {step === 'input' && (
        <form onSubmit={handleSendOtp} className="space-y-5 animate-fade-in">
          <div>
            <label className="block text-xs uppercase tracking-wider text-white/70 mb-2">
              Country & Mobile Number
            </label>
            <div className="flex gap-2">
              <select
                aria-label="Country Code"
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="w-36 rounded-xl border border-white/10 bg-[#14181f] py-3.5 px-3 text-xs text-white outline-none focus:border-[#d4af37] cursor-pointer"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code} className="bg-[#14181f] text-white">
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>

              <div className="relative flex-1">
                <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="tel"
                  required
                  autoComplete="tel-national"
                  value={rawPhone}
                  onChange={(e) => setRawPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="98765 43210"
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3.5 pl-10 pr-4 text-sm text-white placeholder-white/25 outline-none focus:border-[#d4af37]"
                />
              </div>
            </div>
            <p className="text-[11px] text-white/40 mt-2">
              We will send a 6-digit one-time password via SMS to verify your identity.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !rawPhone.trim()}
            className="w-full rounded-xl bg-[#d4af37] py-3.5 text-xs font-semibold uppercase tracking-widest text-black hover:bg-[#e5c158] disabled:opacity-50 transition-all shadow-md cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending OTP...
              </span>
            ) : (
              'Send Verification Code'
            )}
          </button>
        </form>
      )}

      {/* STEP 2: 6-Digit OTP Verification */}
      {step === 'otp' && (
        <div className="space-y-6 animate-fade-in">
          <div className="text-center space-y-1.5">
            <p className="text-xs uppercase tracking-wider text-white/50">Enter 6-digit code sent to</p>
            <div className="flex items-center justify-center gap-2">
              <span className="font-mono text-sm font-semibold text-[#d4af37]">{fullPhoneNumber}</span>
              <button
                type="button"
                onClick={() => setStep('input')}
                className="text-xs text-white/60 hover:text-white underline cursor-pointer"
              >
                Change
              </button>
            </div>
          </div>

          {/* 6 Digits Input */}
          <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
            {otpDigits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  digitInputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-11 h-13 sm:w-12 sm:h-14 text-center font-mono text-xl font-bold rounded-xl border border-white/15 bg-white/5 text-white outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]"
              />
            ))}
          </div>

          {/* Resend timer */}
          <div className="flex items-center justify-between text-xs text-white/50 pt-1">
            <span>Didn&apos;t receive code?</span>
            {cooldown > 0 ? (
              <span className="text-[#d4af37] font-mono">Resend in {cooldown}s</span>
            ) : (
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading}
                className="inline-flex items-center gap-1 text-[#d4af37] hover:underline cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Resend OTP</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => verifyCode()}
            disabled={loading || otpDigits.some((d) => !d)}
            className="w-full rounded-xl bg-[#d4af37] py-3.5 text-xs font-semibold uppercase tracking-widest text-black hover:bg-[#e5c158] disabled:opacity-50 transition-all shadow-md cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Verifying...
              </span>
            ) : (
              'Verify & Sign In'
            )}
          </button>
        </div>
      )}

      {/* STEP 3: Success State */}
      {step === 'success' && (
        <div className="text-center py-6 space-y-4 animate-scale-in">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="font-serif text-2xl text-white">Authentication Verified</h3>
          <p className="text-xs text-white/60">Welcome to CJVELORA. Accessing your secure customer portal...</p>
        </div>
      )}
    </div>
  );
}
