import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';
import GalleryClient from './GalleryClient';

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: 'Gallery - Himalayan Koh Salt Products & Livestock Use',
    description:
      'Browse Himalayan Koh product photos and real-world livestock, wildlife, and kitchen salt use cases.',
    path: '/gallery',
  });
}

export default function Page() {
  return <GalleryClient />;
}
