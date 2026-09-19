import { NextResponse } from 'next/server';

export async function GET() {
  const destination = process.env.CLOUDFLARE_EMAIL_FORWARD || '8002salman@gmail.com';
  const domain = 'himalayankoh.com';

  return NextResponse.json({
    ok: true,
    inbound: {
      active: true,
      destination,
      routes: [
        `sales@${domain} → ${destination}`,
        `anything@${domain} → ${destination} (catch-all)`,
      ],
    },
    outbound: {
      bindingPresent: Boolean(process.env.RESEND_API_KEY || process.env.CLOUDFLARE_API_TOKEN),
      sender: `sales@${domain}`,
      note: `Emails are sent from sales@${domain} via Cloudflare Email Routing & verified domain sending.`,
    },
    domain,
  });
}
