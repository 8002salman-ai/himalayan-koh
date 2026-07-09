import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';
import { getErrorMessage } from '@/lib/errors';
import { getLatestInvoicePdf } from '@/lib/wholesale/issueInvoice';
import type { Json, WholesalePurchaseRequest } from '@/lib/supabase/database.types';

export const runtime = 'nodejs';

/**
 * Serves the most recently issued Tax/Commercial Invoice PDF — issued
 * once, immutably, at conversion time (see serverConvertPurchaseRequest.ts
 * / issueInvoice.ts). Never a live re-render.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: requestId } = await params;

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }
  const token = authHeader.slice(7).trim();

  try {
    const supabase = getSupabaseAdmin();
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 });
    }

    const { data: pr, error: prError } = await supabase
      .from('wholesale_purchase_requests')
      .select('id, dealer_id, request_number, converted_order_id')
      .eq('id', requestId)
      .maybeSingle();
    if (prError) throw prError;
    if (!pr) return NextResponse.json({ error: 'Purchase request not found.' }, { status: 404 });

    const request_ = pr as Pick<WholesalePurchaseRequest, 'id' | 'dealer_id' | 'request_number' | 'converted_order_id'>;

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', userData.user.id).maybeSingle();
    const isAdmin = (profile as { role?: string } | null)?.role === 'admin';
    if (!isAdmin && request_.dealer_id !== userData.user.id) {
      return NextResponse.json({ error: 'Not authorized to view this invoice.' }, { status: 403 });
    }

    if (!request_.converted_order_id) {
      return NextResponse.json(
        { error: 'This purchase request has not been converted into an order yet — no tax invoice is available.' },
        { status: 400 }
      );
    }

    const invoice = await getLatestInvoicePdf(requestId, 'commercial');
    if (!invoice) {
      return NextResponse.json({ error: 'No tax/commercial invoice has been issued for this order yet.' }, { status: 404 });
    }

    return new NextResponse(invoice.buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${request_.request_number}-tax-invoice.pdf"`,
      },
    });
  } catch (error) {
    console.error('Tax invoice download failed:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Unable to fetch tax invoice.') } as Json, { status: 500 });
  }
}
