import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';
import ReturnClient from './ReturnClient';

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: 'Return & Replacement Policy - Himalayan Koh',
    description: 'Return and replacement policy for Himalayan Koh products. Learn about our 30-day return window and replacement procedures.',
    path: '/return',
  });
}

export default function Page() {
  return <ReturnClient />;
}
