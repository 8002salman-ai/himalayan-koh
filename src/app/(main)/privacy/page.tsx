import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';
import PrivacyClient from './PrivacyClient';

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: 'Privacy Policy - Himalayan Koh',
    description: 'Privacy policy for the Himalayan Koh website, accounts, and customer data.',
    path: '/privacy',
  });
}

export default function Page() {
  return <PrivacyClient />;
}
