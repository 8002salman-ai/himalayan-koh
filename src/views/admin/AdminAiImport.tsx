'use client';

import React from 'react';
import { AAIImport } from '../../admin/AdminSection';
import { AppProvider } from '../../App';

export default function AAIImportView() {
  return (
    <AppProvider>
      <div className="w-full">
        <AAIImport />
      </div>
    </AppProvider>
  );
}
