import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verifyAdminRequest';
import { resolveHubspotToken } from '@/lib/hubspot/config';

export async function GET(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const token = await resolveHubspotToken();
  return NextResponse.json({ configured: Boolean(token) });
}
