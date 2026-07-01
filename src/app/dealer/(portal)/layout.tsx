'use client';

import DealerRoute from '@/components/auth/DealerRoute';
import DealerPortalLayout from '@/components/dealer/DealerPortalLayout';

export default function DealerPortalRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <DealerRoute>
      <DealerPortalLayout>{children}</DealerPortalLayout>
    </DealerRoute>
  );
}
