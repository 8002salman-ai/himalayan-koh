import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verifyAdminRequest';
import { upsertContact, HubspotNotConfiguredError } from '@/lib/hubspot/client';

interface SyncLeadBody {
  email?: string;
  name?: string;
  phone?: string | null;
  company?: string | null;
  status?: string | null;
  notes?: string | null;
}

export async function POST(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: SyncLeadBody;
  try {
    body = (await request.json()) as SyncLeadBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const email = body.email?.trim();
  if (!email) {
    return NextResponse.json({ error: 'A lead email is required to sync to HubSpot.' }, { status: 400 });
  }

  try {
    const result = await upsertContact({
      email,
      firstName: body.name ?? null,
      phone: body.phone ?? null,
      company: body.company ?? null,
      leadStatus: body.status ?? null,
      notes: body.notes ?? null,
    });
    return NextResponse.json({ ok: true, contactId: result.id });
  } catch (error) {
    if (error instanceof HubspotNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error('HubSpot sync-lead failed:', error);
    const message = error instanceof Error ? error.message : 'HubSpot sync failed.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
