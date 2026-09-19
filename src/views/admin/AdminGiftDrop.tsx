'use client';

import React from 'react';
import GiftDropAdmin from '../../admin/GiftDropAdmin';
import { AppProvider } from '../../App';

export default function GiftDropAdminView() {
  return (
    <AppProvider>
      <div className="w-full">
        <GiftDropAdmin />
      </div>
    </AppProvider>
  );
}
