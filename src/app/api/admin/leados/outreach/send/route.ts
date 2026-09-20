import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verifyAdminRequest';
import { updateSavedLead, HK_DEFAULT_WORKSPACE_ID } from '@/lib/leados/db';
import { validateOutboundCopy } from '@/lib/leados/claims';
import { sendLeadOSMail } from '@/lib/leados/emailProvider';
import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';

export async function POST(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await request.json();
    const leadId = typeof body.leadId === 'string' ? body.leadId.trim() : '';
    const recipientEmail = typeof body.recipientEmail === 'string' ? body.recipientEmail.trim() : '';
    const recipientName = typeof body.recipientName === 'string' ? body.recipientName.trim() : '';
    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const templateId = typeof body.templateId === 'string' ? body.templateId : null;
    const simulationRequested = body.simulation === true;

    if (!leadId) return NextResponse.json({ error: 'A saved LeadOS lead is required.' }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      return NextResponse.json({ error: 'A valid recipient email address is required.' }, { status: 400 });
    }
    if (!subject) return NextResponse.json({ error: 'Email subject line is required.' }, { status: 400 });
    if (!message) return NextResponse.json({ error: 'Email message body is required.' }, { status: 400 });

    const claimCheck = validateOutboundCopy(`${subject}\n${message}`);
    if (!claimCheck.ok) {
      return NextResponse.json({ error: 'Outbound copy contains claims that are not approved.', claims: claimCheck.claims }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: rawLead, error: leadError } = await (supabase as any)
      .from('leados_leads')
      .select('id, workspace_id, email, email_source, status, notes')
      .eq('id', leadId)
      .eq('workspace_id', HK_DEFAULT_WORKSPACE_ID)
      .maybeSingle();
    const lead = rawLead as { id: string; notes: string | null } | null;
    if (leadError) throw leadError;
    if (!lead) return NextResponse.json({ error: 'Lead not found in the active workspace.' }, { status: 404 });

    const result = await sendLeadOSMail({ to: recipientEmail, subject, text: message }, { simulationRequested });
    const auditDetails = {
      recipient: recipientEmail,
      recipientName: recipientName || null,
      subject,
      templateId,
      provider: result.provider,
      state: result.state,
      providerMessageId: result.providerMessageId,
      sender: 'sales@himalayankoh.com',
      createdAt: new Date().toISOString(),
    };
    const { error: auditError } = await (supabase as any).from('leados_audit_logs').insert({
      workspace_id: HK_DEFAULT_WORKSPACE_ID,
      action: `outreach_${result.state}`,
      entity_type: 'lead',
      entity_id: leadId,
      details: auditDetails,
    });
    if (auditError) throw auditError;

    if (result.state === 'delivered') {
      await updateSavedLead(leadId, {
        status: 'contacted',
        notes: `${lead.notes ? `${lead.notes}\n` : ''}[OUTREACH DELIVERED] ${new Date().toISOString()} provider=${result.provider} id=${result.providerMessageId || 'unavailable'} subject="${subject}"`,
      });
      return NextResponse.json({ ok: true, state: result.state, provider: result.provider, providerMessageId: result.providerMessageId, message: 'Outreach delivered successfully.' });
    }
    if (result.state === 'simulated') {
      return NextResponse.json({ ok: true, state: result.state, simulated: true, provider: result.provider, message: '[SIMULATION] No external email was sent and the lead was not marked Contacted.' });
    }
    if (result.state === 'provider_unavailable') {
      return NextResponse.json({ ok: false, state: result.state, error: result.error }, { status: 503 });
    }
    return NextResponse.json({ ok: false, state: result.state, error: result.error || 'Email provider failed.' }, { status: 502 });
  } catch (error) {
    console.error('LeadOS outreach send error:', error);
    return NextResponse.json({ error: 'Failed to process outreach email request.' }, { status: 500 });
  }
}
