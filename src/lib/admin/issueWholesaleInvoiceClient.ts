export async function issueWholesaleProformaInvoice(
  accessToken: string,
  requestId: string,
  reason?: string
): Promise<{ invoiceNumber: string; version: number }> {
  const response = await fetch(`/api/admin/wholesale/purchase-requests/${requestId}/issue-invoice`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ reason }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || 'Unable to issue invoice.');
  }
  return body;
}
