import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';
import TermsClient from './TermsClient';

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: 'Terms of Service - Himalayan Koh',
    description: 'Terms of service for the Himalayan Koh online store and product purchases.',
    path: '/terms',
  });
}

export default function Page() {
  return <TermsClient />;
}
