import { trackOrderPageUrl } from '@/lib/orders/tracking';
import { adminNotificationEmails, sendEmail, siteBaseUrl } from './sendEmail';

interface OrderEmailSummary {
  orderNumber: string;
  email: string;
  total: number;
  paymentStatus: string;
  paymentMethod?: string | null;
  status?: string;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  carrier?: string | null;
}

function money(value: number): string {
  return `$${Number(value).toFixed(2)}`;
}

function orderItemsHtml(): string {
  return '';
}

export async function sendBuyerOrderConfirmation(order: OrderEmailSummary): Promise<void> {
  const trackUrl = `${siteBaseUrl()}${trackOrderPageUrl(order.orderNumber, order.email)}`;
  const paid = order.paymentStatus === 'paid';

  await sendEmail({
    to: order.email,
    subject: paid
      ? `Order confirmed & paid — ${order.orderNumber}`
      : `Order received — ${order.orderNumber}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
        <h1 style="color:#c45c26">Himalayan Koh</h1>
        <p>Thank you for your order <strong>${order.orderNumber}</strong>.</p>
        <p>Total: <strong>${money(order.total)}</strong></p>
        <p>Payment: <strong>${paid ? 'Paid' : 'Pending (invoice)'}</strong></p>
        ${
          paid
            ? '<p>We are preparing your order for shipment.</p>'
            : '<p>We will contact you to complete payment before shipping.</p>'
        }
        <p style="margin-top:24px">
          <a href="${trackUrl}" style="background:#c45c26;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">
            View order &amp; track shipment
          </a>
        </p>
        <p style="font-size:12px;color:#666;margin-top:24px">12620 FM 1960 W Ste A-4, Houston, TX 77065 · (832) 224-6466</p>
      </div>
    `,
    text: `Thank you for order ${order.orderNumber}. Total ${money(order.total)}. Track: ${trackUrl}`,
  });
}

export async function sendAdminPaymentReceived(order: OrderEmailSummary): Promise<void> {
  const adminUrl = `${siteBaseUrl()}/admin/orders`;
  const recipients = adminNotificationEmails();
  if (recipients.length === 0) return;

  await sendEmail({
    to: recipients,
    subject: `PAID — ship order ${order.orderNumber}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px">
        <h2 style="color:#c45c26">Payment received — ship now</h2>
        <p><strong>${order.orderNumber}</strong> was paid by ${order.email}.</p>
        <p>Total: ${money(order.total)}</p>
        <p>Create the Shippo label and the customer will get tracking automatically.</p>
        <p><a href="${adminUrl}">Open Admin Orders</a></p>
      </div>
    `,
    text: `PAID: ${order.orderNumber} from ${order.email} — ${money(order.total)}. Ship now: ${adminUrl}`,
  });
}

export async function sendBuyerShippedEmail(order: OrderEmailSummary): Promise<void> {
  if (!order.trackingNumber) return;

  const trackUrl = `${siteBaseUrl()}${trackOrderPageUrl(order.orderNumber, order.email)}`;
  const carrierUrl = order.trackingUrl || trackUrl;

  await sendEmail({
    to: order.email,
    subject: `Your order shipped — ${order.orderNumber}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px">
        <h1 style="color:#c45c26">Your package is on the way</h1>
        <p>Order <strong>${order.orderNumber}</strong> has shipped${
          order.carrier ? ` via ${order.carrier}` : ''
        }.</p>
        <p>Tracking number: <strong>${order.trackingNumber}</strong></p>
        <p style="margin:24px 0">
          <a href="${carrierUrl}" style="background:#1a1a1a;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;margin-right:8px">
            Track on carrier site
          </a>
          <a href="${trackUrl}" style="background:#c45c26;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">
            Live tracking on Himalayan Koh
          </a>
        </p>
      </div>
    `,
    text: `Order ${order.orderNumber} shipped. Tracking ${order.trackingNumber}. Track: ${trackUrl}`,
  });
}

export { orderItemsHtml };
