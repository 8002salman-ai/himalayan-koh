'use client';

import React from 'react';
import { ASettings } from '../../admin/AdminSection';
import { AppProvider } from '../../App';

export default function ASettingsView() {
  return (
    <AppProvider>
      <div className="w-full">
        <ASettings />
      </div>
    </AppProvider>
  );
}
