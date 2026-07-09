export const ORDER_PROGRESS_STEPS = [
  { key: 'placed', label: 'Order placed', shortLabel: 'Placed' },
  { key: 'packing', label: 'Packing', shortLabel: 'Packing' },
  { key: 'shipped', label: 'Shipped', shortLabel: 'Shipped' },
  { key: 'delivered', label: 'Delivered', shortLabel: 'Delivered' },
] as const;

export function getOrderProgressIndex(status: string, paymentStatus: string): number {
  if (status === 'cancelled' || status === 'refunded') return -1;
  if (paymentStatus === 'paid' && status === 'pending') return 1;

  const map: Record<string, number> = {
    pending: 0,
    confirmed: 0,
    processing: 1,
    // 'packed' is the tail end of the packing stage (added for the wholesale
    // conversion workflow, but applies to any order) — same progress-bar
    // position as 'processing' so the existing 4-step retail tracker layout
    // is unaffected; formatCustomerOrderStatus/formatAdminOrderStatus give it
    // a distinct label.
    packed: 1,
    shipped: 2,
    delivered: 3,
  };

  return map[status] ?? 0;
}

export function formatCustomerOrderStatus(status: string, paymentStatus: string): string {
  if (status === 'cancelled') return 'Cancelled';
  if (status === 'delivered') return 'Delivered';
  if (status === 'shipped') return 'Shipped';
  if (status === 'packed') return 'Packed — ready to ship';
  if (status === 'processing') return 'Packing';
  if (paymentStatus === 'paid' && status === 'pending') return 'Order received';
  if (paymentStatus === 'pending') return 'Awaiting payment';
  return 'Order placed';
}

export function formatCustomerStatusDetail(
  status: string,
  paymentStatus: string,
  hasTracking: boolean,
): string {
  if (status === 'cancelled') return 'This order was cancelled.';
  if (status === 'delivered') return 'Your package has been delivered.';
  if (status === 'shipped') {
    return hasTracking
      ? 'Your package is on the way — use tracking below for live updates from the carrier.'
      : 'Your order has shipped. Tracking will appear shortly.';
  }
  if (status === 'packed') {
    return 'Your order is packed and ready to ship.';
  }
  if (status === 'processing' || (paymentStatus === 'paid' && status === 'pending')) {
    return 'Payment confirmed. We received your order and are preparing it for shipment.';
  }
  if (paymentStatus === 'pending') {
    return 'Your order is saved. Complete payment and we will start packing.';
  }
  return 'We are processing your order.';
}

export function formatAdminOrderStatus(status: string, paymentStatus: string): string {
  if (status === 'packed') return 'Packed — ready to ship';
  if (status === 'processing') return 'Processing & packing';
  if (paymentStatus === 'paid' && status === 'pending') return 'Paid — ready to pack';
  if (status === 'pending') return 'Awaiting fulfillment';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function getAdminWorkflowHint(order: {
  status: string;
  payment_status: string;
  tracking_number?: string | null;
}): string | null {
  if (order.status === 'cancelled' || order.status === 'delivered') return null;
  if (order.payment_status !== 'paid') {
    return 'Confirm payment before packing or shipping this order.';
  }
  if (order.tracking_number) {
    return 'Label created. Carrier scans will update tracking automatically for the customer.';
  }
  if (order.status === 'packed' || order.status === 'processing' || order.status === 'pending') {
    return 'Next step: create a Shippo label. Status will move to Shipped and the customer gets tracking by email.';
  }
  if (order.status === 'shipped') {
    return 'Package is in transit. Mark Delivered when the carrier confirms delivery.';
  }
  return null;
}

export function orderStatusBadgeClass(status: string, paymentStatus: string): string {
  if (status === 'cancelled') return 'bg-red-100 text-red-700';
  if (status === 'delivered') return 'bg-green-100 text-green-700';
  if (status === 'shipped') return 'bg-indigo-100 text-indigo-700';
  if (status === 'packed' || status === 'processing' || (paymentStatus === 'paid' && status === 'pending')) {
    return 'bg-purple-100 text-purple-700';
  }
  if (paymentStatus === 'paid') return 'bg-green-100 text-green-700';
  return 'bg-yellow-100 text-yellow-700';
}
