'use client';

import React from 'react';
import { CatalogPromotionsPage } from '../../admin/CatalogAdmin';
import { AppProvider } from '../../App';

export default function AdminPromotions() {
  return (
    <AppProvider>
      <div className="w-full">
        <CatalogPromotionsPage />
      </div>
    </AppProvider>
  );
}
