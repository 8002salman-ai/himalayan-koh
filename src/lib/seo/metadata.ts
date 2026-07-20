import type { Metadata } from 'next';
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  DEFAULT_TITLE,
  SITE_NAME,
} from './constants';
import { absoluteUrl, siteOrigin } from './server';

interface BuildMetadataInput {
  title?: string;
  description?: string;
  path: string;
  ogImage?: string | null;
  ogType?: 'website' | 'article' | 'product';
  noindex?: boolean;
}

/** Turn a possibly-relative image path into an absolute URL for OG/Twitter. */
export function absoluteImage(image?: string | null): string {
  const src = image?.trim() || DEFAULT_OG_IMAGE;
  if (/^https?:\/\//i.test(src)) return src;
  return absoluteUrl(src);
}

/**
 * Build a full Next.js Metadata object with canonical + OpenGraph + Twitter.
 * Every public page uses this so search engines and social crawlers get real,
 * server-rendered tags instead of the empty client shell.
 */
export function buildMetadata({
  title,
  description,
  path,
  ogImage,
  ogType = 'website',
  noindex,
}: BuildMetadataInput): Metadata {
  const resolvedTitle = title || DEFAULT_TITLE;
  const resolvedDescription = description || DEFAULT_DESCRIPTION;
  const canonical = absoluteUrl(path);
  const image = absoluteImage(ogImage);

  return {
    title: resolvedTitle,
    description: resolvedDescription,
    metadataBase: new URL(siteOrigin()),
    alternates: { canonical },
    robots: noindex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title: resolvedTitle,
      description: resolvedDescription,
      url: canonical,
      siteName: SITE_NAME,
      type: ogType === 'product' ? 'website' : ogType,
      images: [{ url: image }],
    },
    twitter: {
      card: 'summary_large_image',
      title: resolvedTitle,
      description: resolvedDescription,
      images: [image],
    },
  };
}
