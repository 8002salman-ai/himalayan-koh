import { createElement } from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';
import { ProformaInvoiceDocument, type ProformaInvoiceData } from '@/lib/wholesale/pdf/ProformaInvoiceDocument';
import { TaxInvoiceDocument, type TaxInvoiceData } from '@/lib/wholesale/pdf/TaxInvoiceDocument';
import type {
  Json,
  Order,
  OrderItem,
  WholesalePurchaseRequest,
  WholesalePurchaseRequestInvoice,
  WholesalePurchaseRequestItem,
} from '@/lib/supabase/database.types';

export type IssuedInvoice = WholesalePurchaseRequestInvoice & { pdfBuffer: Buffer };

/**
 * Issuing an invoice is the ONLY way a PDF is produced and persisted in
 * this system. Every issued invoice is an immutable accounting record —
 * a version row plus its exact PDF bytes in storage — never overwritten.
 * Editing quantities/prices after v1 was issued does not change v1; it
 * only changes what a *new* issuance (v2, v3, ...) will contain.
 */
async function nextVersion(supabase: ReturnType<typeof getSupabaseAdmin>, requestId: string, invoiceType: 'proforma' | 'commercial') {
  const { data, error } = await supabase
    .from('wholesale_purchase_request_invoices')
    .select('version')
    .eq('purchase_request_id', requestId)
    .eq('invoice_type', invoiceType)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return ((data as { version: number } | null)?.version ?? 0) + 1;
}

async function storeInvoicePdf(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  requestId: string,
  invoiceType: 'proforma' | 'commercial',
  version: number,
  buffer: Buffer
): Promise<string> {
  const path = `wholesale-invoices/${requestId}/${invoiceType}-v${version}.pdf`;
  const { error } = await supabase.storage.from('dealer-documents').upload(path, buffer, {
    contentType: 'application/pdf',
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function issueProformaInvoice(
  requestId: string,
  issuedBy: string | null,
  supersedeReason?: string
): Promise<IssuedInvoice> {
  const supabase = getSupabaseAdmin();

  const { data: pr, error: prError } = await supabase
    .from('wholesale_purchase_requests')
    .select('*, dealer_application:dealer_applications(business_name)')
    .eq('id', requestId)
    .maybeSingle();
  if (prError) throw prError;
  if (!pr) throw new Error('Purchase request not found.');
  const request = pr as WholesalePurchaseRequest & { dealer_application: { business_name: string } | null };

  const { data: itemRows, error: itemsError } = await supabase
    .from('wholesale_purchase_request_items')
    .select('*')
    .eq('purchase_request_id', requestId);
  if (itemsError) throw itemsError;
  const items = (itemRows as WholesalePurchaseRequestItem[]) || [];

  const data: ProformaInvoiceData = {
    requestNumber: request.request_number,
    status: request.status,
    createdAt: request.created_at,
    dealerBusinessName: request.dealer_application?.business_name || 'Dealer',
    dealerAddress: '',
    shippingAddress: request.shipping_address as unknown as ProformaInvoiceData['shippingAddress'],
    items,
    subtotal: Number(request.subtotal),
    shippingCost: Number(request.shipping_cost),
    taxAmount: Number(request.tax_amount),
    total: Number(request.total),
    currency: request.currency,
  };

  const buffer = await renderToBuffer(
    createElement(ProformaInvoiceDocument, { data }) as unknown as Parameters<typeof renderToBuffer>[0]
  );

  const version = await nextVersion(supabase, requestId, 'proforma');
  const pdfPath = await storeInvoicePdf(supabase, requestId, 'proforma', version, buffer as Buffer);

  const { data: invoice, error: invoiceError } = await supabase
    .from('wholesale_purchase_request_invoices')
    .insert({
      purchase_request_id: requestId,
      invoice_type: 'proforma',
      version,
      snapshot: data as unknown as Json,
      pdf_path: pdfPath,
      issued_by: issuedBy,
      supersede_reason: version > 1 ? supersedeReason || null : null,
    } as never)
    .select()
    .single();
  if (invoiceError) throw invoiceError;

  await supabase.from('wholesale_purchase_request_audit').insert({
    purchase_request_id: requestId,
    actor_id: issuedBy,
    action: version > 1 ? 'proforma_invoice_revised' : 'proforma_invoice_issued',
    details: { version } as unknown as Json,
  } as never);

  return { ...(invoice as WholesalePurchaseRequestInvoice), pdfBuffer: buffer as Buffer };
}

export async function issueCommercialInvoice(
  requestId: string,
  issuedBy: string | null
): Promise<IssuedInvoice> {
  const supabase = getSupabaseAdmin();

  const { data: pr, error: prError } = await supabase
    .from('wholesale_purchase_requests')
    .select('*, dealer_application:dealer_applications(business_name)')
    .eq('id', requestId)
    .maybeSingle();
  if (prError) throw prError;
  if (!pr) throw new Error('Purchase request not found.');
  const request = pr as WholesalePurchaseRequest & { dealer_application: { business_name: string } | null };

  if (!request.converted_order_id) {
    throw new Error('This purchase request has not been converted into an order yet — no tax invoice is available.');
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', request.converted_order_id)
    .maybeSingle();
  if (orderError) throw orderError;
  if (!order) throw new Error('Converted order not found.');
  const orderRow = order as Order & { order_items: OrderItem[] };

  const data: TaxInvoiceData = {
    orderNumber: orderRow.order_number,
    requestNumber: request.request_number,
    createdAt: orderRow.created_at,
    paymentStatus: orderRow.payment_status,
    dealerBusinessName: request.dealer_application?.business_name || 'Dealer',
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

  const version = await nextVersion(supabase, requestId, 'commercial');
  const pdfPath = await storeInvoicePdf(supabase, requestId, 'commercial', version, buffer as Buffer);

  const { data: invoice, error: invoiceError } = await supabase
    .from('wholesale_purchase_request_invoices')
    .insert({
      purchase_request_id: requestId,
      invoice_type: 'commercial',
      version,
      snapshot: data as unknown as Json,
      pdf_path: pdfPath,
      issued_by: issuedBy,
    } as never)
    .select()
    .single();
  if (invoiceError) throw invoiceError;

  await supabase.from('wholesale_purchase_request_audit').insert({
    purchase_request_id: requestId,
    actor_id: issuedBy,
    action: 'commercial_invoice_issued',
    details: { version, orderId: orderRow.id, orderNumber: orderRow.order_number } as unknown as Json,
  } as never);

  return { ...(invoice as WholesalePurchaseRequestInvoice), pdfBuffer: buffer as Buffer };
}

export async function getLatestInvoicePdf(
  requestId: string,
  invoiceType: 'proforma' | 'commercial'
): Promise<{ buffer: Buffer; invoiceNumber: string } | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('wholesale_purchase_request_invoices')
    .select('pdf_path, invoice_number')
    .eq('purchase_request_id', requestId)
    .eq('invoice_type', invoiceType)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as { pdf_path: string; invoice_number: string };
  const { data: file, error: downloadError } = await supabase.storage.from('dealer-documents').download(row.pdf_path);
  if (downloadError) throw downloadError;

  const arrayBuffer = await file.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), invoiceNumber: row.invoice_number };
}
