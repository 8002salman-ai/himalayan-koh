'use client';

import React from 'react';
import { AEmailMarketing } from '../../admin/AdminSection';
import { AppProvider } from '../../App';

export default function AEmailMarketingView() {
  return (
    <AppProvider>
      <div className="w-full">
        <AEmailMarketing />
      </div>
    </AppProvider>
  );
}
