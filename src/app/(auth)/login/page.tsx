import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';
import LoginClient from './LoginClient';

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: 'Sign In - Himalayan Koh',
    description: 'Sign in to your Himalayan Koh account to track orders and manage your profile.',
    path: '/login',
    noindex: true,
  });
}

export default function Page() {
  return <LoginClient />;
}
