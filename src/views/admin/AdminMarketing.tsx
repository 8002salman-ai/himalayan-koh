'use client';

import React from 'react';
import { AMarketingGen } from '../../admin/AdminSection';
import { AppProvider } from '../../App';

export default function AMarketingGenView() {
  return (
    <AppProvider>
      <div className="w-full">
        <AMarketingGen />
      </div>
    </AppProvider>
  );
}
