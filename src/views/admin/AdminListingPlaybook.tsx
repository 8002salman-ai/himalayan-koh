'use client';

import React from 'react';
import { ListingPlaybookAdmin } from '../../admin/ListingPlaybookAdmin';
import { AppProvider } from '../../App';

export default function ListingPlaybookAdminView() {
  return (
    <AppProvider>
      <div className="w-full">
        <ListingPlaybookAdmin />
      </div>
    </AppProvider>
  );
}
