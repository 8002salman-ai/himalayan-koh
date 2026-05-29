import {
  sendAdminPaymentReceived,
  sendBuyerOrderConfirmation,
  sendBuyerShippedEmail,
} from '@/lib/email/orderEmails';
import { resolveTrackingUrl } from '@/lib/orders/tracking';
import { notifyAdmins } from '@/lib/notifications/adminNotify';
import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';

interface OrderNotifyRow {
  order_number: string;
  email: string;
  total: number;
  payment_status: string;
  payment_method: string | null;
  status: string;
  tracking_number: string | null;
  tracking_url: string | null;
  shipping_carrier: string | null;
}

async function loadOrderSummary(orderId: string): Promise<OrderNotifyRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('orders')
    .select(
      'order_number, email, total, payment_status, payment_method, status, tracking_number, tracking_url, shipping_carrier'
    )
    .eq('id', orderId)
    .maybeSingle();

  if (error) throw error;
  return (data as OrderNotifyRow | null) || null;
}

function toEmailSummary(row: OrderNotifyRow) {
  return {
    orderNumber: row.order_number,
    email: row.email,
    total: Number(row.total),
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    status: row.status,
    trackingNumber: row.tracking_number,
    trackingUrl: resolveTrackingUrl(row),
    carrier: row.shipping_carrier,
  };
}

/** Fire-and-forget — never throw to callers. */
export function dispatchOrderCreatedNotifications(orderId: string): void {
  void (async () => {
    try {
      const row = await loadOrderSummary(orderId);
      if (!row) return;
      if (row.payment_method === 'stripe_card' && row.payment_status === 'pending') {
        return;
      }
      await sendBuyerOrderConfirmation(toEmailSummary(row));
    } catch (error) {
      console.error('Order created notifications failed:', error);
    }
  })();
}

export function dispatchPaymentReceivedNotifications(orderId: string): void {
  void (async () => {
    try {
      const row = await loadOrderSummary(orderId);
      if (!row) return;
      const summary = toEmailSummary(row);
      await Promise.all([
        sendBuyerOrderConfirmation(summary),
        sendAdminPaymentReceived(summary),
        notifyAdmins(
          'Payment received — ship now',
          `${row.order_number} paid by ${row.email} · $${Number(row.total).toFixed(2)}. Create Shippo label.`,
          { orderId, orderNumber: row.order_number, type: 'payment_paid' }
        ),
      ]);
    } catch (error) {
      console.error('Payment received notifications failed:', error);
    }
  })();
}

export function dispatchOrderShippedNotifications(orderId: string): void {
  void (async () => {
    try {
      const row = await loadOrderSummary(orderId);
      if (!row?.tracking_number) return;
      const summary = toEmailSummary(row);
      await Promise.all([
        sendBuyerShippedEmail(summary),
        notifyAdmins(
          'Order shipped',
          `${row.order_number} shipped · ${row.tracking_number}`,
          { orderId, orderNumber: row.order_number, trackingNumber: row.tracking_number, type: 'shipped' }
        ),
      ]);
    } catch (error) {
      console.error('Order shipped notifications failed:', error);
    }
  })();
}
