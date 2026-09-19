'use client';

import React from 'react';
import HermesIntel from '../../admin/HermesIntel';
import { AppProvider } from '../../App';

export default function HermesIntelView() {
  return (
    <AppProvider>
      <div className="w-full">
        <HermesIntel />
      </div>
    </AppProvider>
  );
}
