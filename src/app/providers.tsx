'use client';

import { Suspense } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import HashUrlRedirect from '@/components/HashUrlRedirect';
import RouteScrollRestoration from '@/components/RouteScrollRestoration';
import SEO from '@/components/SEO';

/** SEO / scroll helpers use search params and must suspend — keep off the main page tree. */
function ClientEffects() {
  return (
    <Suspense fallback={null}>
      <HashUrlRedirect />
      <RouteScrollRestoration />
      <SEO />
    </Suspense>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ClientEffects />
      {children}
    </AuthProvider>
  );
}
