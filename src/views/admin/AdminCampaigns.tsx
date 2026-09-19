'use client';

import React from 'react';
import CampaignManager from '../../admin/CampaignManager';
import { AppProvider } from '../../App';

export default function CampaignManagerView() {
  return (
    <AppProvider>
      <div className="w-full">
        <CampaignManager />
      </div>
    </AppProvider>
  );
}
