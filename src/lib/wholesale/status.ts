import type { WholesalePurchaseRequest } from '@/lib/supabase/database.types';

export type PurchaseRequestStatus = WholesalePurchaseRequest['status'];

export const PURCHASE_REQUEST_PROGRESS_STEPS = [
  { key: 'submitted', label: 'Request submitted', shortLabel: 'Submitted' },
  { key: 'waiting_stock', label: 'Stock verification', shortLabel: 'Stock check' },
  { key: 'approved', label: 'Approved', shortLabel: 'Approved' },
  { key: 'payment_pending', label: 'Payment pending', shortLabel: 'Payment' },
  { key: 'paid', label: 'Paid — converting to order', shortLabel: 'Paid' },
] as const;

const TERMINAL_STATUSES: PurchaseRequestStatus[] = ['rejected', 'cancelled', 'converted'];

export function isTerminalPurchaseRequestStatus(status: PurchaseRequestStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function getPurchaseRequestProgressIndex(status: PurchaseRequestStatus): number {
  if (status === 'rejected' || status === 'cancelled') return -1;
  if (status === 'converted') return PURCHASE_REQUEST_PROGRESS_STEPS.length;
  const map: Record<string, number> = {
    submitted: 0,
    changes_requested: 0,
    waiting_stock: 1,
    approved: 2,
    payment_pending: 3,
    paid: 4,
  };
  return map[status] ?? 0;
}

export function formatPurchaseRequestStatus(status: PurchaseRequestStatus): string {
  switch (status) {
    case 'submitted':
      return 'Submitted';
    case 'waiting_stock':
      return 'Waiting for stock verification';
    case 'approved':
      return 'Approved — awaiting payment';
    case 'rejected':
      return 'Rejected';
    case 'changes_requested':
      return 'Changes requested';
    case 'payment_pending':
      return 'Payment pending';
    case 'paid':
      return 'Paid — preparing your order';
    case 'converted':
      return 'Converted to order';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

export function purchaseRequestStatusBadgeClass(status: PurchaseRequestStatus): string {
  switch (status) {
    case 'rejected':
    case 'cancelled':
      return 'bg-red-100 text-red-700';
    case 'changes_requested':
      return 'bg-amber-100 text-amber-700';
    case 'converted':
      return 'bg-green-100 text-green-700';
    case 'paid':
      return 'bg-emerald-100 text-emerald-700';
    case 'approved':
    case 'payment_pending':
      return 'bg-purple-100 text-purple-700';
    case 'waiting_stock':
      return 'bg-blue-100 text-blue-700';
    default:
      return 'bg-yellow-100 text-yellow-700';
  }
}

/** Statuses an admin can transition a request into from its current status. */
export function allowedNextStatuses(status: PurchaseRequestStatus): PurchaseRequestStatus[] {
  switch (status) {
    case 'submitted':
      return ['waiting_stock', 'approved', 'rejected', 'changes_requested', 'cancelled'];
    case 'waiting_stock':
      return ['approved', 'rejected', 'changes_requested', 'cancelled'];
    case 'changes_requested':
      return ['waiting_stock', 'approved', 'rejected', 'cancelled'];
    case 'approved':
      return ['payment_pending', 'cancelled'];
    case 'payment_pending':
      return ['paid', 'cancelled'];
    case 'paid':
      return ['converted', 'cancelled'];
    default:
      return [];
  }
}
