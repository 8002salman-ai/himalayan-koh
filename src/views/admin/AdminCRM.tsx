'use client';

import React from 'react';
import { ACRM } from '../../admin/AdminSection';
import { AppProvider } from '../../App';

export default function ACRMView() {
  return (
    <AppProvider>
      <div className="w-full">
        <ACRM />
      </div>
    </AppProvider>
  );
}
