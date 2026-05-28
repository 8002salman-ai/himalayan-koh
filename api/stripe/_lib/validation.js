const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @param {unknown} body
 */
export function validateCreatePaymentIntentBody(body) {
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const orderId = typeof body?.orderId === 'string' ? body.orderId.trim() : '';
  const couponCode = typeof body?.couponCode === 'string' ? body.couponCode : '';
  const shippingMethod = body?.shippingMethod === 'expedited' ? 'expedited' : 'standard';
  const items = Array.isArray(body?.items) ? body.items : [];

  if (!email || !EMAIL_RE.test(email)) {
    return { ok: false, status: 400, error: 'A valid email is required.' };
  }

  if (items.length === 0) {
    return { ok: false, status: 400, error: 'Cart items are required to create a payment.' };
  }

  const lineItems = items
    .map((item) => ({
      quantity: Math.max(1, Math.floor(Number(item?.quantity) || 0)),
      unitPrice: Math.max(0, Number(item?.price ?? item?.unitPrice) || 0),
    }))
    .filter((item) => item.quantity > 0 && item.unitPrice > 0);

  if (lineItems.length === 0) {
    return { ok: false, status: 400, error: 'No valid cart line items were provided.' };
  }

  return {
    ok: true,
    data: { email, orderId, couponCode, shippingMethod, lineItems },
  };
}

/**
 * @param {unknown} body
 */
export function validateVerifyPaymentBody(body) {
  const orderId = typeof body?.orderId === 'string' ? body.orderId.trim() : '';
  const paymentIntentId =
    typeof body?.paymentIntentId === 'string' ? body.paymentIntentId.trim() : '';

  if (!orderId || !paymentIntentId) {
    return { ok: false, status: 400, error: 'orderId and paymentIntentId are required.' };
  }

  return { ok: true, data: { orderId, paymentIntentId } };
}
