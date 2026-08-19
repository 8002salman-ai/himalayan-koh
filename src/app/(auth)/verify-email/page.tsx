import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';
import VerifyEmailClient from './VerifyEmailClient';

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: 'Verify Email - Himalayan Koh',
    description: 'Verify your email address for your Himalayan Koh account.',
    path: '/verify-email',
    noindex: true,
  });
}

export default function Page() {
  return <VerifyEmailClient />;
}
