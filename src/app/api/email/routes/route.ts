import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_DESTINATION = process.env.CLOUDFLARE_EMAIL_FORWARD || '8002salman@gmail.com';
const DOMAIN = 'himalayankoh.com';

const IN_MEMORY_ROUTES = [
  { id: '1', address: `sales@${DOMAIN}`, local: 'sales', forwardsTo: DEFAULT_DESTINATION, enabled: true },
  { id: '2', address: `contact@${DOMAIN}`, local: 'contact', forwardsTo: DEFAULT_DESTINATION, enabled: true },
  { id: '3', address: `info@${DOMAIN}`, local: 'info', forwardsTo: DEFAULT_DESTINATION, enabled: true },
  { id: '4', address: `support@${DOMAIN}`, local: 'support', forwardsTo: DEFAULT_DESTINATION, enabled: true },
];

export async function GET() {
  return NextResponse.json({
    ok: true,
    configured: true,
    domain: DOMAIN,
    routes: IN_MEMORY_ROUTES,
    destinations: [{ email: DEFAULT_DESTINATION, verified: true }],
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body.name || '').trim().toLowerCase().replace(/@.*$/, '');
    const forwardTo = String(body.forwardTo || DEFAULT_DESTINATION).trim();

    if (!name) {
      return NextResponse.json({ ok: false, error: 'Address local part is required' }, { status: 400 });
    }

    const fullAddress = `${name}@${DOMAIN}`;
    const existing = IN_MEMORY_ROUTES.find((r) => r.local === name);
    if (!existing) {
      IN_MEMORY_ROUTES.push({
        id: String(Date.now()),
        address: fullAddress,
        local: name,
        forwardsTo: forwardTo,
        enabled: true,
      });
    }

    return NextResponse.json({
      ok: true,
      message: `Address ${fullAddress} created forwarding to ${forwardTo}`,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get('name')?.trim().toLowerCase();

  if (!name) {
    return NextResponse.json({ ok: false, error: 'Address local part is required' }, { status: 400 });
  }

  const idx = IN_MEMORY_ROUTES.findIndex((r) => r.local === name);
  if (idx !== -1) {
    IN_MEMORY_ROUTES.splice(idx, 1);
  }

  return NextResponse.json({
    ok: true,
    message: `Address ${name}@${DOMAIN} removed`,
  });
}
