import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verifyAdminRequest';
import { getErrorMessage } from '@/lib/errors';
import { issueProformaInvoice } from '@/lib/wholesale/issueInvoice';

/**
 * Explicit admin action to (re-)issue the Proforma Invoice — used after
 * editing quantities/prices in the review route, when the admin wants the
 * dealer to see updated numbers. Never touches a prior version; always
 * inserts a new one (see issueInvoice.ts / migration 021).
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: requestId } = await params;

  let reason: string | undefined;
  try {
    const body = (await request.json()) as { reason?: string };
    reason = body.reason;
  } catch {
    // No body is fine — reason is optional.
  }

  try {
    const invoice = await issueProformaInvoice(requestId, auth.userId, reason);
    return NextResponse.json({ invoiceNumber: invoice.invoice_number, version: invoice.version });
  } catch (error) {
    console.error('Issuing revised proforma invoice failed:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Unable to issue invoice.') }, { status: 500 });
  }
}
