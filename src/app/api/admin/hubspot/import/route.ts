import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verifyAdminRequest';
import { listContacts, HubspotNotConfiguredError } from '@/lib/hubspot/client';
import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';

export async function POST(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const contacts = await listContacts(100);
    if (contacts.length === 0) {
      return NextResponse.json({ ok: true, imported: 0, skipped: 0 });
    }

    const supabase = getSupabaseAdmin();

    // Dedupe against existing CRM leads by email.
    const emails = contacts.map((c) => c.email.toLowerCase());
    const { data: existing } = await supabase
      .from('crm_leads')
      .select('email')
      .in('email', emails);

    const existingSet = new Set(
      ((existing ?? []) as { email: string }[]).map((r) => r.email.toLowerCase()),
    );

    const toInsert = contacts
      .filter((c) => !existingSet.has(c.email.toLowerCase()))
      .map((c) => ({
        name: [c.firstName, c.lastName].filter(Boolean).join(' ').trim() || c.email,
        email: c.email,
        phone: c.phone,
        company: c.company,
        source: 'other' as const,
        subject: 'Imported from HubSpot',
      }));

    let imported = 0;
    if (toInsert.length > 0) {
      const { error } = await supabase.from('crm_leads').insert(toInsert as never);
      if (error) throw error;
      imported = toInsert.length;
    }

    return NextResponse.json({
      ok: true,
      imported,
      skipped: contacts.length - imported,
    });
  } catch (error) {
    if (error instanceof HubspotNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error('HubSpot import failed:', error);
    const message = error instanceof Error ? error.message : 'HubSpot import failed.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
