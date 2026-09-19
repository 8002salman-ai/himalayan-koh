'use client';

import React from 'react';
import { CatalogProductEditor } from '@/admin/CatalogAdmin';
import { AppProvider } from '@/App';

export default function AdminProductEditPage() {
  return (
    <AppProvider>
      <div className="w-full">
        <CatalogProductEditor />
      </div>
    </AppProvider>
  );
}
