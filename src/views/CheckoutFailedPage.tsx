import { Link, useSearchParams } from 'react-router-dom';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { clearPendingStripeCheckout } from '../lib/payments/stripeSessionStorage';

export default function CheckoutFailedPage() {
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason');
  clearPendingStripeCheckout();

  return (
    <div className="min-h-screen bg-warm-white py-16 px-4 sm:px-6">
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-md p-8 text-center">
        <XCircle size={48} className="mx-auto mb-4 text-red-500/80" />
        <h1 className="font-serif text-2xl font-bold text-charcoal mb-2">Payment failed</h1>
        <p className="text-charcoal-light text-sm mb-6">
          {reason === 'declined'
            ? 'Your card was declined. Try another card or choose invoice checkout.'
            : 'We could not complete your card payment. No charge was completed — you can try again.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/checkout"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-himalayan hover:bg-himalayan-dark text-white font-semibold rounded-xl transition-colors"
          >
            <RefreshCw size={18} />
            Try again
          </Link>
          <Link
            to="/products"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-200 text-charcoal font-semibold rounded-xl hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={18} />
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
