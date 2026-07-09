import type { Order } from '@/lib/supabase/database.types';

export async function convertWholesalePurchaseRequest(accessToken: string, requestId: string): Promise<Order> {
  const response = await fetch(`/api/admin/wholesale/purchase-requests/${requestId}/convert`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || 'Unable to convert purchase request to an order.');
  }
  return body as Order;
}
