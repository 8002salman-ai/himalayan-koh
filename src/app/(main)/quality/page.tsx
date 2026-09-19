import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';
import QualityClient from './QualityClient';

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: 'Quality Standards & Sourcing Protocols - Himalayan Koh',
    description:
      'Learn about our ethical geological salt sourcing in Khewra, Pakistan, transatlantic handling, rigorous incoming inspection protocols, and Houston warehouse standards.',
    path: '/quality',
  });
}

export default function Page() {
  return <QualityClient />;
}
