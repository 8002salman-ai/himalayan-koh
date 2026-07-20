import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verifyAdminRequest';
import { sendDealerStatusEmail } from '@/lib/email/dealerEmails';
import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';
import type { Database } from '@/lib/supabase/database.types';

type DealerStatus = Database['public']['Tables']['dealer_applications']['Row']['status'];

const dealerStatuses: DealerStatus[] = [
  'pending',
  'under_review',
  'need_more_info',
  'approved',
  'rejected',
  'suspended',
];

export async function POST(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const applicationId = typeof record.applicationId === 'string' ? record.applicationId.trim() : '';
  const status = typeof record.status === 'string' ? record.status.trim() : '';
  const reason = typeof record.reason === 'string' ? record.reason.trim() : undefined;

  if (!applicationId) {
    return NextResponse.json({ error: 'applicationId is required.' }, { status: 400 });
  }
  if (!dealerStatuses.includes(status as DealerStatus)) {
    return NextResponse.json({ error: 'Invalid wholesale application status.' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: existing, error: fetchError } = await supabase
      .from('dealer_applications')
      .select('id, business_email, status')
      .eq('id', applicationId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existing) {
      return NextResponse.json({ error: 'Dealer application not found.' }, { status: 404 });
    }

    const businessEmail = (existing as { business_email: string }).business_email;

    const { data: updated, error: updateError } = await supabase
      .from('dealer_applications')
      .update({
        status: status as DealerStatus,
        status_reason: reason || null,
        reviewed_by: auth.userId,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', applicationId)
      .select()
      .single();

    if (updateError) throw updateError;

    await supabase.from('dealer_audit_log').insert({
      application_id: applicationId,
      actor_id: auth.userId,
      action: `status_changed_to_${status}`,
      details: reason ? { reason } : null,
    } as never);

    const emailResult = await sendDealerStatusEmail({
      to: businessEmail,
      status: status as DealerStatus,
      reason,
    });

    if (emailResult) {
      await supabase.from('dealer_emails').insert({
        application_id: applicationId,
        email_type: `status_${status}`,
        sent_to: businessEmail,
        subject: emailResult.subject,
      } as never);
    }

    return NextResponse.json({ ok: true, application: updated });
  } catch (error) {
    console.error('Admin dealer status update failed:', error);
    const message = error instanceof Error ? error.message : 'Unable to update wholesale application.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
