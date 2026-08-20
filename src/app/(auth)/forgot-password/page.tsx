import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';
import ForgotPasswordClient from './ForgotPasswordClient';

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: 'Reset Password - Himalayan Koh',
    description: 'Request a password reset link for your Himalayan Koh account.',
    path: '/forgot-password',
    noindex: true,
  });
}

export default function Page() {
  return <ForgotPasswordClient />;
}
