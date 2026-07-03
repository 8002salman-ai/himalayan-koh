const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The payment amount is always derived from orders.total (computed
// server-side from real product prices in serverCreateOrder), never from
// client-supplied item prices — see create-payment-intent/route.ts.
// orderId is therefore required; `items` is accepted only to report an
// item count in Stripe metadata and carries no price data.
export function validateCreatePaymentIntentBody(body: unknown) {
  const record = body as Record<string, unknown>;
  const email = typeof record?.email === 'string' ? record.email.trim() : '';
  const orderId = typeof record?.orderId === 'string' ? record.orderId.trim() : '';
  const couponCode = typeof record?.couponCode === 'string' ? record.couponCode : '';
  const shippingMethod: 'standard' | 'expedited' =
    record?.shippingMethod === 'expedited' ? 'expedited' : 'standard';
  const items = Array.isArray(record?.items) ? record.items : [];

  if (!email || !EMAIL_RE.test(email)) {
    return { ok: false as const, status: 400, error: 'A valid email is required.' };
  }

  if (!orderId) {
    return { ok: false as const, status: 400, error: 'orderId is required to create a payment.' };
  }

  const itemCount = items.reduce((sum, item) => {
    const row = item as Record<string, unknown>;
    return sum + Math.max(1, Math.floor(Number(row?.quantity) || 0));
  }, 0);

  return {
    ok: true as const,
    data: { email, orderId, couponCode, shippingMethod, itemCount },
  };
}

export function validateVerifyPaymentBody(body: unknown) {
  const record = body as Record<string, unknown>;
  const orderId = typeof record?.orderId === 'string' ? record.orderId.trim() : '';
  const paymentIntentId =
    typeof record?.paymentIntentId === 'string' ? record.paymentIntentId.trim() : '';

  if (!orderId || !paymentIntentId) {
    return { ok: false as const, status: 400, error: 'orderId and paymentIntentId are required.' };
  }

  return { ok: true as const, data: { orderId, paymentIntentId } };
}
