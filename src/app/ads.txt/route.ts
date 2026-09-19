import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export async function GET() {
  const content = [
    '# Himalayan Koh - Google AdSense ads.txt',
    '# OWNER ACTION REQUIRED: Once Google AdSense account is approved, insert your publisher ID below:',
    '# Example: google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0',
    '# Status: Pending Google AdSense approval and publisher ID provision by site owner.',
  ].join('\n');

  return new NextResponse(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
