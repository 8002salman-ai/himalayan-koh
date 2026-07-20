import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';
import { notifyAdmins } from '@/lib/notifications/adminNotify';
import {
  sendPurchaseRequestAdminAlert,
  sendPurchaseRequestConvertedEmail,
  sendPurchaseRequestDealerEmail,
} from '@/lib/email/wholesaleEmails';
import { getLatestInvoicePdf } from '@/lib/wholesale/issueInvoice';
import type { WholesalePurchaseRequest } from '@/lib/supabase/database.types';

interface PurchaseRequestNotifyRow {
  id: string;
  request_number: string;
  status: WholesalePurchaseRequest['status'];
  total: number;
  dealer_id: string;
}

async function loadRequestWithDealer(requestId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('wholesale_purchase_requests')
    .select('id, request_number, status, total, dealer_id, dealer_application_id')
    .eq('id', requestId)
    .maybeSingle();
  if (error) throw error;
  const row = data as (PurchaseRequestNotifyRow & { dealer_application_id: string }) | null;
  if (!row) return null;

  const [{ data: profile }, { data: application }] = await Promise.all([
    supabase.from('profiles').select('email').eq('id', row.dealer_id).maybeSingle(),
    supabase.from('dealer_applications').select('business_name').eq('id', row.dealer_application_id).maybeSingle(),
  ]);

  return {
    row,
    email: (profile as { email?: string } | null)?.email || null,
    businessName: (application as { business_name?: string } | null)?.business_name || 'Wholesaler',
  };
}

async function logEmail(requestId: string, emailType: string, sentTo: string, subject: string) {
  const supabase = getSupabaseAdmin();
  await supabase.from('wholesale_purchase_request_emails').insert({
    purchase_request_id: requestId,
    email_type: emailType,
    sent_to: sentTo,
    subject,
  } as never);
}

/** Fire-and-forget — never throw to callers. */
export function dispatchPurchaseRequestSubmittedNotifications(requestId: string): void {
  void (async () => {
    try {
      const loaded = await loadRequestWithDealer(requestId);
      if (!loaded || !loaded.email) return;

      // Proforma Invoice v1 is issued synchronously during submission
      // (serverCreatePurchaseRequest.ts) before this fires, so it always
      // exists by the time these emails go out.
      const proforma = await getLatestInvoicePdf(requestId, 'proforma').catch(() => null);

      const [dealerResult] = await Promise.all([
        sendPurchaseRequestDealerEmail({
          to: loaded.email,
          requestNumber: loaded.row.request_number,
          status: 'submitted',
          proformaPdf: proforma?.buffer,
        }),
        sendPurchaseRequestAdminAlert({
          requestNumber: loaded.row.request_number,
          dealerBusinessName: loaded.businessName,
          total: Number(loaded.row.total),
          itemCount: 0,
          proformaPdf: proforma?.buffer,
        }),
        notifyAdmins(
          'New wholesale purchase request',
          `${loaded.row.request_number} from ${loaded.businessName} · $${Number(loaded.row.total).toFixed(2)}`,
          { requestId, requestNumber: loaded.row.request_number, type: 'purchase_request_submitted' }
        ),
      ]);

      if (dealerResult) {
        await logEmail(requestId, 'submitted', loaded.email, dealerResult.subject);
      }
    } catch (error) {
      console.error('Purchase request submitted notifications failed:', error);
    }
  })();
}

export function dispatchPurchaseRequestStatusChangedNotifications(requestId: string, reason?: string | null): void {
  void (async () => {
    try {
      const loaded = await loadRequestWithDealer(requestId);
      if (!loaded || !loaded.email) return;

      const result = await sendPurchaseRequestDealerEmail({
        to: loaded.email,
        requestNumber: loaded.row.request_number,
        status: loaded.row.status,
        reason,
      });
      if (result) {
        await logEmail(requestId, `status_${loaded.row.status}`, loaded.email, result.subject);
      }
    } catch (error) {
      console.error('Purchase request status notifications failed:', error);
    }
  })();
}

export function dispatchPurchaseRequestConvertedNotifications(requestId: string, orderNumber: string): void {
  void (async () => {
    try {
      const loaded = await loadRequestWithDealer(requestId);
      if (!loaded || !loaded.email) return;

      // Tax/Commercial invoice is issued synchronously right after
      // conversion (serverConvertPurchaseRequest.ts) before this fires.
      const taxInvoice = await getLatestInvoicePdf(requestId, 'commercial').catch(() => null);

      const result = await sendPurchaseRequestConvertedEmail({
        to: loaded.email,
        requestNumber: loaded.row.request_number,
        orderNumber,
        taxInvoicePdf: taxInvoice?.buffer,
      });
      if (result) {
        await logEmail(requestId, 'converted', loaded.email, result.subject);
      }
    } catch (error) {
      console.error('Purchase request converted notifications failed:', error);
    }
  })();
}
