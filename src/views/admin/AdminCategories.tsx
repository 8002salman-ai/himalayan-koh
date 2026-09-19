'use client';

import React from 'react';
import { ACategories } from '../../admin/AdminSection';
import { AppProvider } from '../../App';

export default function ACategoriesView() {
  return (
    <AppProvider>
      <div className="w-full">
        <ACategories />
      </div>
    </AppProvider>
  );
}
