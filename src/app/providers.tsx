'use client';

import { Suspense } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import HashUrlRedirect from '@/components/HashUrlRedirect';
import NavigationProgress from '@/components/NavigationProgress';
import RouteScrollRestoration from '@/components/RouteScrollRestoration';
import StaleChunkRecovery from '@/components/StaleChunkRecovery';

/**
 * Scroll helpers use search params and must suspend — keep off the main page tree.
 *
 * SEO used to be mounted here too. It imperatively mutated <title>/<meta>/
 * <link rel="canonical"> in document.head on every route change (a Vite/
 * react-router leftover from before the Next.js migration) — the same nodes
 * Next's own generateMetadata already server-renders and reconciles for
 * every route. The two fought over the same DOM nodes on every navigation,
 * which surfaced as a repeating "Cannot read properties of null (reading
 * 'removeChild')" crash in react-dom's commit phase and, because the crash
 * landed mid-navigation, left the router looking stuck on the previous page
 * until a manual reload. Removed rather than fixed in place: every route
 * already has real Next.js metadata, so the component was pure redundancy.
 */
function ClientEffects() {
  return (
    <Suspense fallback={null}>
      <HashUrlRedirect />
      <NavigationProgress />
      <RouteScrollRestoration />
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
