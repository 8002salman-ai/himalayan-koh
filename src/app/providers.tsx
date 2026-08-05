'use client';

import { Suspense } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import HashUrlRedirect from '@/components/HashUrlRedirect';
import NavigationProgress from '@/components/NavigationProgress';
import RouteScrollRestoration from '@/components/RouteScrollRestoration';
import SEO from '@/components/SEO';
import StaleChunkRecovery from '@/components/StaleChunkRecovery';

/** SEO / scroll helpers use search params and must suspend — keep off the main page tree. */
function ClientEffects() {
  return (
    <Suspense fallback={null}>
      <HashUrlRedirect />
      <NavigationProgress />
      <RouteScrollRestoration />
      <SEO />
    </Suspense>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <StaleChunkRecovery />
        <ClientEffects />
        {children}
      </ToastProvider>
    </AuthProvider>
  );
}
