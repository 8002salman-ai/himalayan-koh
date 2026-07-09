import { createElement } from 'react';
import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';
import { getErrorMessage } from '@/lib/errors';
import { ProformaInvoiceDocument, type ProformaInvoiceData } from '@/lib/wholesale/pdf/ProformaInvoiceDocument';
import type { Json, WholesalePurchaseRequest, WholesalePurchaseRequestItem } from '@/lib/supabase/database.types';

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
    .select('*, dealer_application:dealer_applications(business_name, address, city, state, zip, country)')
    .eq('id', requestId)
    .maybeSingle();
  if (prError) throw prError;
  if (!pr) return { ok: false as const, status: 404, error: 'Purchase request not found.' };

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userData.user.id).maybeSingle();
  const isAdmin = (profile as { role?: string } | null)?.role === 'admin';
  const request_ = pr as WholesalePurchaseRequest & {
    dealer_application: { business_name: string; address: string; city: string; state: string; zip: string; country: string } | null;
  };

  if (!isAdmin && request_.dealer_id !== userData.user.id) {
    return { ok: false as const, status: 403, error: 'Not authorized to view this invoice.' };
  }

  return { ok: true as const, purchaseRequest: request_ };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: requestId } = await params;

  try {
    const auth = await authorize(request, requestId);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = getSupabaseAdmin();
    const { data: items, error: itemsError } = await supabase
      .from('wholesale_purchase_request_items')
      .select('*')
      .eq('purchase_request_id', requestId);
    if (itemsError) throw itemsError;

    const pr = auth.purchaseRequest;
    const data: ProformaInvoiceData = {
      requestNumber: pr.request_number,
      status: pr.status,
      createdAt: pr.created_at,
      dealerBusinessName: pr.dealer_application?.business_name || 'Dealer',
      dealerAddress: '',
      shippingAddress: pr.shipping_address as unknown as ProformaInvoiceData['shippingAddress'],
      items: (items as WholesalePurchaseRequestItem[]) || [],
      subtotal: Number(pr.subtotal),
      shippingCost: Number(pr.shipping_cost),
      taxAmount: Number(pr.tax_amount),
      total: Number(pr.total),
      currency: pr.currency,
    };

    const buffer = await renderToBuffer(
      createElement(ProformaInvoiceDocument, { data }) as unknown as Parameters<typeof renderToBuffer>[0]
    );

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${pr.request_number}-proforma-invoice.pdf"`,
      },
    });
  } catch (error) {
    console.error('Proforma invoice generation failed:', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Unable to generate proforma invoice.') } as Json,
      { status: 500 }
    );
  }
}
