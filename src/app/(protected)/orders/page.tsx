import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';
import OrdersClient from './OrdersClient';

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: 'My Orders - Himalayan Koh',
    description: 'View and track your Himalayan Koh orders.',
    path: '/orders',
    noindex: true,
  });
}

export default function Page() {
  return <OrdersClient />;
}
