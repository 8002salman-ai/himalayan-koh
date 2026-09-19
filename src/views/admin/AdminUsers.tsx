'use client';

import React from 'react';
import { AUsers } from '../../admin/AdminSection';
import { AppProvider } from '../../App';

export default function AUsersView() {
  return (
    <AppProvider>
      <div className="w-full">
        <AUsers />
      </div>
    </AppProvider>
  );
}
