export function orderConfirmationUrl(orderId: string): string {
  return `/order-confirmation?orderId=${encodeURIComponent(orderId)}`;
}
