import type { WholesalePurchaseRequest } from '@/lib/supabase/database.types';

export type PurchaseRequestStatus = WholesalePurchaseRequest['status'];

export const PURCHASE_REQUEST_PROGRESS_STEPS = [
  { key: 'submitted', label: 'Request submitted', shortLabel: 'Submitted' },
  { key: 'waiting_stock', label: 'Automatic stock check', shortLabel: 'Stock check' },
  { key: 'stock_verified', label: 'Stock verified', shortLabel: 'Verified' },
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
    ready_for_review: 1,
    waiting_stock: 1,
    stock_verified: 2,
    approved: 3,
    payment_pending: 4,
    paid: 5,
  };
  return map[status] ?? 0;
}

export function formatPurchaseRequestStatus(status: PurchaseRequestStatus): string {
  switch (status) {
    case 'submitted':
      return 'Submitted';
    case 'ready_for_review':
      return 'Ready for review — stock available';
    case 'waiting_stock':
      return 'Waiting for stock';
    case 'stock_verified':
      return 'Stock verified — ready for approval';
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
    case 'stock_verified':
      return 'bg-teal-100 text-teal-700';
    case 'ready_for_review':
      return 'bg-blue-100 text-blue-700';
    case 'waiting_stock':
      return 'bg-orange-100 text-orange-700';
    default:
      return 'bg-yellow-100 text-yellow-700';
  }
}

/**
 * Statuses an admin can transition a request into from its current status.
 * This is the single enforcement point for "Approval must never be
 * possible until Stock Verification has been completed" — 'approved' only
 * ever appears in the array returned for the 'stock_verified' case. There
 * is deliberately no path from 'submitted', 'ready_for_review', or
 * 'waiting_stock' straight to 'approved'.
 */
export function allowedNextStatuses(status: PurchaseRequestStatus): PurchaseRequestStatus[] {
  switch (status) {
    case 'submitted':
      // Transient — the automatic stock check (serverCreatePurchaseRequest)
      // moves this to ready_for_review/waiting_stock immediately after
      // creation. Listed here only so an admin can force a re-check.
      return ['ready_for_review', 'waiting_stock', 'rejected', 'cancelled'];
    case 'ready_for_review':
      return ['stock_verified', 'waiting_stock', 'rejected', 'changes_requested', 'cancelled'];
    case 'waiting_stock':
      return ['stock_verified', 'ready_for_review', 'rejected', 'changes_requested', 'cancelled'];
    case 'stock_verified':
      return ['approved', 'rejected', 'changes_requested', 'cancelled'];
    case 'changes_requested':
      return ['ready_for_review', 'waiting_stock', 'stock_verified', 'rejected', 'cancelled'];
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

/** Line items must all be resolved (auto-available, or explicitly
 * overridden by an admin) before a request can move to 'stock_verified'. */
export function canVerifyStock(items: { auto_stock_check: string | null; stock_verified: boolean }[]): boolean {
  if (items.length === 0) return false;
  return items.every((item) => item.stock_verified || item.auto_stock_check === 'available');
}
