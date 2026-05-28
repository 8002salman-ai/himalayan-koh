import type { Metadata } from 'next';
import Providers from './providers';
import './globals.css';
import { publicEnv } from '@/lib/env';

const siteOrigin = publicEnv.siteUrl?.trim() || 'https://himalayankoh.com';

export const metadata: Metadata = {
  title: 'Himalayan Koh – Premium Himalayan Pink Salt for Livestock & Cooking',
  description:
    'Premium Himalayan Pink Salt for horses, cattle, deer, and edible cooking. All natural, 84 trace minerals.',
  metadataBase: new URL(siteOrigin),
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
