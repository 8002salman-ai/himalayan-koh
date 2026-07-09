import { createElement } from 'react';
import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';
import { getErrorMessage } from '@/lib/errors';
import { TaxInvoiceDocument, type TaxInvoiceData } from '@/lib/wholesale/pdf/TaxInvoiceDocument';
import type { Json, Order, OrderItem, WholesalePurchaseRequest } from '@/lib/supabase/database.types';

export const runtime = 'nodejs';

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
      .select('*, dealer_application:dealer_applications(business_name)')
      .eq('id', requestId)
      .maybeSingle();
    if (prError) throw prError;
    if (!pr) return NextResponse.json({ error: 'Purchase request not found.' }, { status: 404 });

    const request_ = pr as WholesalePurchaseRequest & { dealer_application: { business_name: string } | null };

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

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', request_.converted_order_id)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!order) return NextResponse.json({ error: 'Converted order not found.' }, { status: 404 });

    const orderRow = order as Order & { order_items: OrderItem[] };

    const data: TaxInvoiceData = {
      orderNumber: orderRow.order_number,
      requestNumber: request_.request_number,
      createdAt: orderRow.created_at,
      paymentStatus: orderRow.payment_status,
      dealerBusinessName: request_.dealer_application?.business_name || 'Dealer',
      shippingAddress: orderRow.shipping_address as unknown as TaxInvoiceData['shippingAddress'],
      items: orderRow.order_items,
      subtotal: Number(orderRow.subtotal),
      shippingCost: Number(orderRow.shipping_cost),
      taxAmount: Number(orderRow.tax_amount),
      total: Number(orderRow.total),
      currency: orderRow.currency,
    };

    const buffer = await renderToBuffer(
      createElement(TaxInvoiceDocument, { data }) as unknown as Parameters<typeof renderToBuffer>[0]
    );

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${orderRow.order_number}-tax-invoice.pdf"`,
      },
    });
  } catch (error) {
    console.error('Tax invoice generation failed:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Unable to generate tax invoice.') } as Json, { status: 500 });
  }
}
