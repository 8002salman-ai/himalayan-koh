'use client';

import React from 'react';
import { AAIHub } from '../../admin/AdminSection';
import { AppProvider } from '../../App';

export default function AAIHubView() {
  return (
    <AppProvider>
      <div className="w-full">
        <AAIHub />
      </div>
    </AppProvider>
  );
}
