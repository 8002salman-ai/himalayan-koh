'use client';

import React from 'react';
import BlogManager from '../../admin/BlogManager';
import { AppProvider } from '../../App';

export default function BlogManagerView() {
  return (
    <AppProvider>
      <div className="w-full">
        <BlogManager />
      </div>
    </AppProvider>
  );
}
