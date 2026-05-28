'use client';

import { Suspense } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import HashUrlRedirect from '@/components/HashUrlRedirect';
import RouteScrollRestoration from '@/components/RouteScrollRestoration';
import SEO from '@/components/SEO';

function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HashUrlRedirect />
      <RouteScrollRestoration />
      <SEO />
      {children}
    </>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Suspense fallback={null}>
        <ClientShell>{children}</ClientShell>
      </Suspense>
    </AuthProvider>
  );
}
