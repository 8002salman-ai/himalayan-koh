'use client';

import React from 'react';
import CJSetup from '../../admin/CJSetup';
import { AppProvider } from '../../App';

export default function CJSetupView() {
  return (
    <AppProvider>
      <div className="w-full">
        <CJSetup />
      </div>
    </AppProvider>
  );
}
