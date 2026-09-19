'use client';

import React from 'react';
import { AVariantGen } from '../../admin/AdminSection';
import { AppProvider } from '../../App';

export default function AVariantGenView() {
  return (
    <AppProvider>
      <div className="w-full">
        <AVariantGen />
      </div>
    </AppProvider>
  );
}
