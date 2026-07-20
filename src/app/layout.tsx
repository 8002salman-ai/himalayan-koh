import type { Metadata } from 'next';
import Providers from './providers';
import './globals.css';
import { siteOrigin } from '@/lib/seo/server';
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, SITE_NAME } from '@/lib/seo/constants';

const origin = siteOrigin();

export const metadata: Metadata = {
  title: {
    default: DEFAULT_TITLE,
    template: '%s',
  },
  description: DEFAULT_DESCRIPTION,
  metadataBase: new URL(origin),
  alternates: { canonical: '/' },
  openGraph: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: origin,
    siteName: SITE_NAME,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  icons: {
    icon: '/logo.svg',
    shortcut: '/logo.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;0,8..60,600;0,8..60,700;0,8..60,800;1,8..60,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
