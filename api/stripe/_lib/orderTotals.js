/** Server-side mirror of src/lib/supabase/api/orders.ts totals (kept in JS for Vercel API routes). */

export const TAX_RATE = 0.0825;
export const FREE_SHIPPING_THRESHOLD = 50;
export const STANDARD_SHIPPING_COST = 9.95;
export const EXPEDITED_SHIPPING_COST = 18.95;

export const supportedCoupons = {
  HKWELCOME10: { label: '10% welcome discount', percentage: 0.1 },
};

/**
 * @param {{ quantity: number; unitPrice: number }[]} items
 * @param {{ couponCode?: string; shippingMethod?: 'standard' | 'expedited' }} [options]
 */
export function calculateOrderTotals(items, options = {}) {
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.unitPrice) * Number(item.quantity),
    0
  );
  const normalizedCoupon = (options.couponCode || '').trim().toUpperCase();
  const coupon = supportedCoupons[normalizedCoupon];
  const discountAmount = coupon ? subtotal * coupon.percentage : 0;
  const taxableSubtotal = Math.max(0, subtotal - discountAmount);
  const shippingMethod = options.shippingMethod === 'expedited' ? 'expedited' : 'standard';
  const shippingCost = shippingMethod === 'expedited'
    ? EXPEDITED_SHIPPING_COST
    : subtotal >= FREE_SHIPPING_THRESHOLD
      ? 0
      : STANDARD_SHIPPING_COST;
  const taxAmount = taxableSubtotal * TAX_RATE;
  const total = taxableSubtotal + shippingCost + taxAmount;

  return { subtotal, shippingCost, discountAmount, taxAmount, total };
}
