export function formatPaymentMethod(method: string | null | undefined): string {
  if (!method || method === 'invoice') return 'Invoice';
  if (method === 'stripe_card' || method === 'stripe') return 'Credit / debit card';
  return method.replace(/_/g, ' ');
}

export function formatPaymentStatus(status: string | null | undefined): string {
  if (!status) return 'Unknown';
  return status.replace(/_/g, ' ');
}
