'use client';

import CustomerOnlyRoute from '@/components/auth/CustomerOnlyRoute';

export default function CustomerOrdersLayout({ children }: { children: React.ReactNode }) {
  return <CustomerOnlyRoute>{children}</CustomerOnlyRoute>;
}
