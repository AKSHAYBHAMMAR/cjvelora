'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function LoginRedirectHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const redirectUrl = searchParams.get('redirect') || searchParams.get('next');
    const destination = redirectUrl
      ? `/customer/login?redirect=${encodeURIComponent(redirectUrl)}`
      : '/customer/login';
    router.replace(destination);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-[#0a0e14] flex items-center justify-center text-white">
      <Loader2 className="w-8 h-8 animate-spin text-[#d4af37]" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0e14] flex items-center justify-center text-white">
          <Loader2 className="w-8 h-8 animate-spin text-[#d4af37]" />
        </div>
      }
    >
      <LoginRedirectHandler />
    </Suspense>
  );
}
