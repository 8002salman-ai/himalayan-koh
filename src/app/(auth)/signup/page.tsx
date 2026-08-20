import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';
import SignupClient from './SignupClient';

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: 'Create Account - Himalayan Koh',
    description: 'Create a Himalayan Koh account to track orders and manage your profile.',
    path: '/signup',
    noindex: true,
  });
}

export default function Page() {
  return <SignupClient />;
}
