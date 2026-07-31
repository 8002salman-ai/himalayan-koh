import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE } from '@/lib/seo/constants';
import { localBusinessJsonLd } from '@/lib/seo/jsonLd';
import JsonLd from '@/components/seo/JsonLd';
import HomeClient from './HomeClient';

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    path: '/',
  });
}

export default function Page() {
  return (
    <>
      <JsonLd data={localBusinessJsonLd()} />
      <HomeClient />
    </>
  );
}
