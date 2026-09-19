'use client';

import React from 'react';
import { ListingTaskAdmin } from '../../admin/ListingTaskAdmin';
import { AppProvider } from '../../App';

export default function ListingTaskAdminView() {
  return (
    <AppProvider>
      <div className="w-full">
        <ListingTaskAdmin />
      </div>
    </AppProvider>
  );
}
