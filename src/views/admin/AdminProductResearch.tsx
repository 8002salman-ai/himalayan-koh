'use client';

import React from 'react';
import ProductResearch from '../../admin/ProductResearch';
import { AppProvider } from '../../App';

export default function ProductResearchView() {
  return (
    <AppProvider>
      <div className="w-full">
        <ProductResearch />
      </div>
    </AppProvider>
  );
}
