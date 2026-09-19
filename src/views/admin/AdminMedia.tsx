'use client';

import React from 'react';
import MediaManager from '../../admin/MediaManager';
import { AppProvider } from '../../App';

export default function MediaManagerView() {
  return (
    <AppProvider>
      <div className="w-full">
        <MediaManager />
      </div>
    </AppProvider>
  );
}
