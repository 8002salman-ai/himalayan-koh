'use client';

import React from 'react';
import { AOrders } from '../../admin/AdminSection';
import { AppProvider } from '../../App';

export default function AOrdersView() {
  return (
    <AppProvider>
      <div className="w-full">
        <AOrders />
      </div>
    </AppProvider>
  );
}
