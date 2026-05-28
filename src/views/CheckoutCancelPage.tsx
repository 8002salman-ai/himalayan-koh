import { Link } from 'react-router-dom';
import { XCircle, ArrowLeft } from 'lucide-react';
import { clearPendingStripeCheckout } from '../lib/payments/stripeSessionStorage';

export default function CheckoutCancelPage() {
  clearPendingStripeCheckout();

  return (
    <div className="min-h-screen bg-warm-white py-16 px-4 sm:px-6">
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-md p-8 text-center">
        <XCircle size={48} className="mx-auto mb-4 text-charcoal/40" />
        <h1 className="font-serif text-2xl font-bold text-charcoal mb-2">Payment cancelled</h1>
        <p className="text-charcoal-light text-sm mb-6">
          No charge was made. Your cart is unchanged — you can review your order and try again when ready.
        </p>
        <Link
          to="/checkout"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-charcoal hover:bg-charcoal-light text-white font-semibold rounded-xl transition-colors"
        >
          <ArrowLeft size={18} />
          Back to checkout
        </Link>
      </div>
    </div>
  );
}
