'use client';

import React from 'react';
import { CatalogProductsPage } from '../../admin/CatalogAdmin';
import { AppProvider } from '../../App';

export default function AdminProducts() {
  return (
    <AppProvider>
      <div className="w-full">
        <CatalogProductsPage />
      </div>
    </AppProvider>
  );
}
