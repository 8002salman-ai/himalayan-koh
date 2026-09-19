'use client';

import React from 'react';
import PaymentsSetup from '../../admin/PaymentsSetup';
import { AppProvider } from '../../App';

export default function PaymentsSetupView() {
  return (
    <AppProvider>
      <div className="w-full">
        <PaymentsSetup />
      </div>
    </AppProvider>
  );
}
