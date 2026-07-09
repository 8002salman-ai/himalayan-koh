import type { WholesalePurchaseRequest, WholesalePurchaseRequestItem } from '@/lib/supabase/database.types';

export interface ReviewPurchaseRequestParams {
  requestId: string;
  status?: WholesalePurchaseRequest['status'];
  reason?: string;
  changeNote?: string;
  expectedDispatchDate?: string;
  paymentMethod?: string;
  items?: Array<{
    itemId: string;
    stockVerified?: boolean;
    adjustedQuantity?: number;
    adjustedUnitPrice?: number;
  }>;
}

export async function reviewWholesalePurchaseRequest(
  accessToken: string,
  params: ReviewPurchaseRequestParams
): Promise<{ request: WholesalePurchaseRequest; items: WholesalePurchaseRequestItem[] }> {
  const { requestId, ...body } = params;
  const response = await fetch(`/api/admin/wholesale/purchase-requests/${requestId}/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const responseBody = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(responseBody.error || 'Unable to update purchase request.');
  }
  return responseBody;
}
