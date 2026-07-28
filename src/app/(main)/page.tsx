import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE } from '@/lib/seo/constants';
import HomeClient from './HomeClient';

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    path: '/',
  });
}

// Organization + WebSite JSON-LD is emitted once in the root layout for every
// route, so the homepage does not repeat it here.
export default function Page() {
  return <HomeClient />;
}
