import { sendEmail, siteBaseUrl, adminNotificationEmails } from './sendEmail';
import type { WholesalePurchaseRequest } from '@/lib/supabase/database.types';

/**
 * Wholesale Purchase Request emails are intentionally independent from
 * retail order emails (src/lib/email/orderEmails.ts) and from dealer
 * application emails (src/lib/email/dealerEmails.ts) — separate templates,
 * separate log table (wholesale_purchase_request_emails), separate
 * business process.
 */

type PurchaseRequestStatus = WholesalePurchaseRequest['status'];

const statusCopy: Partial<Record<PurchaseRequestStatus, { subject: string; heading: string; body: (requestNumber: string) => string }>> = {
  submitted: {
    subject: 'Purchase request received',
    heading: 'Purchase request received',
    body: (n) => `We've received your purchase request ${n}. The proforma invoice is attached (also available in your dealer portal). Our team will verify stock and follow up shortly.`,
  },
  waiting_stock: {
    subject: 'Verifying stock for your purchase request',
    heading: 'Verifying stock availability',
    body: (n) => `We're confirming stock availability for purchase request ${n}. We'll notify you as soon as it's reviewed.`,
  },
  approved: {
    subject: 'Your purchase request was approved',
    heading: 'Approved — payment pending',
    body: (n) => `Purchase request ${n} has been approved. Please arrange payment (bank transfer or cash) to proceed — see your dealer portal for details.`,
  },
  rejected: {
    subject: 'Update on your purchase request',
    heading: 'Purchase request rejected',
    body: (n) => `After review, we are unable to fulfill purchase request ${n} at this time.`,
  },
  changes_requested: {
    subject: 'Changes requested on your purchase request',
    heading: 'Changes requested',
    body: (n) => `We need to adjust purchase request ${n} before it can proceed. Please review the notes in your dealer portal.`,
  },
  payment_pending: {
    subject: 'Payment pending for your purchase request',
    heading: 'Payment pending',
    body: (n) => `Purchase request ${n} is approved and awaiting your payment. Once received, we'll begin processing your order.`,
  },
  paid: {
    subject: 'Payment confirmed for your purchase request',
    heading: 'Payment confirmed',
    body: (n) => `We've confirmed payment for purchase request ${n}. Your order is now being prepared.`,
  },
  cancelled: {
    subject: 'Your purchase request was cancelled',
    heading: 'Purchase request cancelled',
    body: (n) => `Purchase request ${n} has been cancelled.`,
  },
};

export async function sendPurchaseRequestDealerEmail(params: {
  to: string;
  requestNumber: string;
  status: PurchaseRequestStatus;
  reason?: string | null;
  proformaPdf?: Buffer;
}): Promise<{ subject: string } | null> {
  const copy = statusCopy[params.status];
  if (!copy) return null;

  const subject = `${copy.subject} — ${params.requestNumber}`;
  const sent = await sendEmail({
    to: params.to,
    subject,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
        <h1 style="color:#b86452">Himalayan Koh Wholesale</h1>
        <h2>${copy.heading}</h2>
        <p>${copy.body(params.requestNumber)}</p>
        ${params.reason ? `<p><strong>Note from our team:</strong> ${params.reason}</p>` : ''}
        <p style="margin-top:24px">
          <a href="${siteBaseUrl()}/dealer/purchase-requests" style="background:#b86452;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">
            View in Dealer Portal
          </a>
        </p>
        <p style="font-size:12px;color:#666;margin-top:24px">12620 FM 1960 W Ste A-4, Houston, TX 77065 · (832) 224-6466</p>
      </div>
    `,
    attachments: params.proformaPdf
      ? [{ filename: `${params.requestNumber}-proforma-invoice.pdf`, content: params.proformaPdf }]
      : undefined,
  });

  return sent ? { subject } : null;
}

export async function sendPurchaseRequestConvertedEmail(params: {
  to: string;
  requestNumber: string;
  orderNumber: string;
  taxInvoicePdf?: Buffer;
}): Promise<{ subject: string } | null> {
  const subject = `Purchase request ${params.requestNumber} is now order ${params.orderNumber}`;
  const sent = await sendEmail({
    to: params.to,
    subject,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
        <h1 style="color:#b86452">Himalayan Koh Wholesale</h1>
        <h2>Your order has been created</h2>
        <p>Purchase request <strong>${params.requestNumber}</strong> has been converted into order <strong>${params.orderNumber}</strong>.</p>
        <p>The tax/commercial invoice is attached, and also available in your dealer portal. You'll receive shipment tracking as your order progresses.</p>
        <p style="margin-top:24px">
          <a href="${siteBaseUrl()}/dealer/purchase-requests" style="background:#b86452;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">
            View in Dealer Portal
          </a>
        </p>
      </div>
    `,
    attachments: params.taxInvoicePdf
      ? [{ filename: `${params.orderNumber}-tax-invoice.pdf`, content: params.taxInvoicePdf }]
      : undefined,
  });
  return sent ? { subject } : null;
}

export async function sendPurchaseRequestAdminAlert(params: {
  requestNumber: string;
  dealerBusinessName: string;
  total: number;
  itemCount: number;
  proformaPdf?: Buffer;
}): Promise<boolean> {
  const recipients = adminNotificationEmails();
  if (recipients.length === 0) return false;

  const adminUrl = `${siteBaseUrl()}/admin/dealers/purchase-requests`;

  return sendEmail({
    to: recipients,
    subject: `New wholesale purchase request — ${params.requestNumber}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px">
        <h2 style="color:#c45c26">New purchase request</h2>
        <p><strong>${params.requestNumber}</strong> from <strong>${params.dealerBusinessName}</strong></p>
        <p>${params.itemCount} line item(s) · Total: $${params.total.toFixed(2)}</p>
        <p><a href="${adminUrl}">Review in Admin</a></p>
      </div>
    `,
    text: `New purchase request ${params.requestNumber} from ${params.dealerBusinessName} — ${params.itemCount} items, $${params.total.toFixed(2)}. Review: ${adminUrl}`,
    attachments: params.proformaPdf
      ? [{ filename: `${params.requestNumber}-purchase-request.pdf`, content: params.proformaPdf }]
      : undefined,
  });
}
