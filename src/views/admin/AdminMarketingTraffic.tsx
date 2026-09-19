'use client';

import React from 'react';
import { AMarketingTraffic } from '../../admin/AdminSection';
import { AppProvider } from '../../App';

export default function AMarketingTrafficView() {
  return (
    <AppProvider>
      <div className="w-full">
        <AMarketingTraffic />
      </div>
    </AppProvider>
  );
}
