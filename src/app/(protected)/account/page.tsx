import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';
import AccountClient from './AccountClient';

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: 'My Account - Himalayan Koh',
    description: 'Manage your Himalayan Koh account settings and profile.',
    path: '/account',
    noindex: true,
  });
}

export default function Page() {
  return <AccountClient />;
}
