import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';
import { getErrorMessage } from '@/lib/errors';
import { getLatestInvoicePdf } from '@/lib/wholesale/issueInvoice';
import type { Json, WholesalePurchaseRequest } from '@/lib/supabase/database.types';

export const runtime = 'nodejs';

async function authorize(request: Request, requestId: string) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return { ok: false as const, status: 401, error: 'Sign in required.' };
  const token = authHeader.slice(7).trim();

  const supabase = getSupabaseAdmin();
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return { ok: false as const, status: 401, error: 'Invalid or expired session.' };

  const { data: pr, error: prError } = await supabase
    .from('wholesale_purchase_requests')
    .select('id, dealer_id, request_number')
    .eq('id', requestId)
    .maybeSingle();
  if (prError) throw prError;
  if (!pr) return { ok: false as const, status: 404, error: 'Purchase request not found.' };

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userData.user.id).maybeSingle();
  const isAdmin = (profile as { role?: string } | null)?.role === 'admin';
  const request_ = pr as Pick<WholesalePurchaseRequest, 'id' | 'dealer_id' | 'request_number'>;

  if (!isAdmin && request_.dealer_id !== userData.user.id) {
    return { ok: false as const, status: 403, error: 'Not authorized to view this invoice.' };
  }

  return { ok: true as const, purchaseRequest: request_ };
}

/**
 * Serves the most recently issued Proforma Invoice PDF — the exact bytes
 * stored when it was issued (submission time, or a later explicit
 * re-issue after an edit), never a live re-render. See issueInvoice.ts.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: requestId } = await params;

  try {
    const auth = await authorize(request, requestId);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const invoice = await getLatestInvoicePdf(requestId, 'proforma');
    if (!invoice) {
      return NextResponse.json({ error: 'No proforma invoice has been issued for this request yet.' }, { status: 404 });
    }

    return new NextResponse(invoice.buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${auth.purchaseRequest.request_number}-proforma-invoice.pdf"`,
      },
    });
  } catch (error) {
    console.error('Proforma invoice download failed:', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Unable to fetch proforma invoice.') } as Json,
      { status: 500 }
    );
  }
}
