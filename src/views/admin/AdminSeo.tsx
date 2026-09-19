'use client';

import React from 'react';
import { ASEOEngine } from '../../admin/AdminSection';
import { AppProvider } from '../../App';

export default function ASEOEngineView() {
  return (
    <AppProvider>
      <div className="w-full">
        <ASEOEngine />
      </div>
    </AppProvider>
  );
}
