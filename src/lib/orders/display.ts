export function formatPaymentMethod(method: string | null | undefined): string {
  if (!method || method === 'invoice') return 'Invoice';
  if (method === 'stripe_card' || method === 'stripe') return 'Credit / debit card';
  if (method === 'stripe_klarna') return 'Klarna';
  if (method === 'stripe_afterpay_clearpay') return 'Afterpay / Clearpay';
  if (method === 'stripe_affirm') return 'Affirm';
  return method.replace(/^stripe_/, '').replace(/_/g, ' ');
}

export function formatPaymentStatus(status: string | null | undefined): string {
  if (!status) return 'Unknown';
  return status.replace(/_/g, ' ');
}
