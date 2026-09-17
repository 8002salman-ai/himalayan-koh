import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';
import AboutClient from './AboutClient';

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: 'About Himalayan Koh — Unrefined Himalayan Pink Salt',
    description:
      'Himalayan Koh packs unrefined Himalayan pink salt for kitchens and homes: fine and coarse edible grades, salt blocks, lamps and bulk bags.',
    path: '/about',
  });
}

export default function Page() {
  return <AboutClient />;
}
