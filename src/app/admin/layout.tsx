'use client';

import AdminRoute from '@/components/auth/AdminRoute';
import AdminLayout from '@/components/admin/AdminLayout';
import { AppProvider } from '@/App';

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminRoute>
      <AppProvider>
        <AdminLayout>{children}</AdminLayout>
      </AppProvider>
    </AdminRoute>
  );
}

