'use client';

import React from 'react';
import { AReviews } from '../../admin/AdminSection';
import { AppProvider } from '../../App';

export default function AReviewsView() {
  return (
    <AppProvider>
      <div className="w-full">
        <AReviews />
      </div>
    </AppProvider>
  );
}
