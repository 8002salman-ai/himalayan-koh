import { NextResponse } from 'next/server';
import { resolveShippoConfigError } from '@/lib/shippo/config';

export const runtime = 'nodejs';

/**
 * Runtime Shippo status for the client. Enabled = API key + warehouse address
 * are configured (via Admin → Settings DB or env). This lets the owner turn
 * Shippo on by saving keys in Settings — no redeploy / no NEXT_PUBLIC flag.
 * The build-time NEXT_PUBLIC_SHIPPO_ENABLED still forces-on as a fallback.
 */
export async function GET() {
  const configError = await resolveShippoConfigError();
  const envForced = process.env.NEXT_PUBLIC_SHIPPO_ENABLED === 'true';
  return NextResponse.json({
    enabled: configError === null || envForced,
    configured: configError === null,
    reason: configError,
  });
}
