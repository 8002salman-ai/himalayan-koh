'use client';

import React from 'react';
import ProductScout from '../../admin/ProductScout';
import { AppProvider } from '../../App';

export default function ProductScoutView() {
  return (
    <AppProvider>
      <div className="w-full">
        <ProductScout />
      </div>
    </AppProvider>
  );
}
