const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  if (items.length === 0) {
    return { ok: false as const, status: 400, error: 'Cart items are required to create a payment.' };
  }

  const lineItems = items
    .map((item) => {
      const row = item as Record<string, unknown>;
      return {
        quantity: Math.max(1, Math.floor(Number(row?.quantity) || 0)),
        unitPrice: Math.max(0, Number(row?.price ?? row?.unitPrice) || 0),
      };
    })
    .filter((item) => item.quantity > 0 && item.unitPrice > 0);

  if (lineItems.length === 0) {
    return { ok: false as const, status: 400, error: 'No valid cart line items were provided.' };
  }

  return {
    ok: true as const,
    data: { email, orderId, couponCode, shippingMethod, lineItems },
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
