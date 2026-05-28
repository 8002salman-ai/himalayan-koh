const STORAGE_KEY = 'himalayan_koh_stripe_checkout';

export interface PendingStripeCheckout {
  orderId: string;
  paymentIntentId: string;
}

export function savePendingStripeCheckout(pending: PendingStripeCheckout): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
  } catch {
    // Private mode / quota — redirect flow may still work if caller passes IDs explicitly.
  }
}

export function loadPendingStripeCheckout(): PendingStripeCheckout | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingStripeCheckout;
    if (!parsed?.orderId || !parsed?.paymentIntentId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingStripeCheckout(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
