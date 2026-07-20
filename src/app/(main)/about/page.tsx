import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';
import AboutClient from './AboutClient';

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: 'About Himalayan Koh - Premium Natural Pink Salt',
    description:
      'Learn about Himalayan Koh and our premium, all-natural Himalayan pink salt for livestock, wildlife, and the kitchen.',
    path: '/about',
  });
}

export default function Page() {
  return <AboutClient />;
}
