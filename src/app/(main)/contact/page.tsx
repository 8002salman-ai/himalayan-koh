import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';
import ContactClient from './ContactClient';

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: 'Contact Himalayan Koh - Product & Support',
    description:
      'Contact Himalayan Koh for product questions, shipping, and customer support.',
    path: '/contact',
  });
}

export default function Page() {
  return <ContactClient />;
}
