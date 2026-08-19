import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';
import ResetPasswordClient from './ResetPasswordClient';

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: 'Set New Password - Himalayan Koh',
    description: 'Set a new password for your Himalayan Koh account.',
    path: '/reset-password',
    noindex: true,
  });
}

export default function Page() {
  return <ResetPasswordClient />;
}
