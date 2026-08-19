import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';
import WishlistClient from './WishlistClient';

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: 'My Wishlist - Himalayan Koh',
    description: 'View the Himalayan Koh products you have saved.',
    path: '/wishlist',
    noindex: true,
  });
}

export default function Page() {
  return <WishlistClient />;
}
