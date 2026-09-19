'use client';

import React from 'react';
import AiControlCenter from '../../admin/AiControlCenter';
import { AppProvider } from '../../App';

export default function AiControlCenterView() {
  return (
    <AppProvider>
      <div className="w-full">
        <AiControlCenter />
      </div>
    </AppProvider>
  );
}
