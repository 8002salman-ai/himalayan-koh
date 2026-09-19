'use client';

import React from 'react';
import { ADashboard } from '../../admin/AdminSection';
import { AppProvider } from '../../App';

export default function ADashboardView() {
  return (
    <AppProvider>
      <div className="w-full">
        <ADashboard />
      </div>
    </AppProvider>
  );
}
