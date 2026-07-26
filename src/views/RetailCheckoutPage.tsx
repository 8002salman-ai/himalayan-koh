import CheckoutPage from './CheckoutPage';

/**
 * Retail checkout policy layer.
 *
 * Retail checkout is Stripe-only. The underlying checkout still owns order
 * creation, shipping, coupons, address validation, PaymentIntent creation,
 * and confirmation.
 */
export default function RetailCheckoutPage() {
  return <CheckoutPage retailOnly />;
}
