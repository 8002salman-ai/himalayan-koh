import { FormEvent, useMemo, useState } from 'react';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { loadStripe, type StripeElementsOptions } from '@stripe/stripe-js';
import { Loader2 } from 'lucide-react';
import { getStripeSuccessUrl } from '../../lib/payments/checkoutUrls';

interface StripePaymentFormProps {
  clientSecret: string;
  amountLabel: string;
  publishableKey: string;
  disabled?: boolean;
  onSuccess: () => Promise<void>;
  onError: (message: string) => void;
}

function PaymentFormInner({
  amountLabel,
  disabled,
  onSuccess,
  onError,
  publishableKey,
}: Omit<StripePaymentFormProps, 'clientSecret'>) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements || disabled) return;

    setPaying(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: getStripeSuccessUrl(),
        },
        redirect: 'if_required',
      });

      if (error) {
        onError(error.message || 'Card payment failed. Please try again.');
        return;
      }

      if (paymentIntent && paymentIntent.status !== 'succeeded') {
        onError('Payment is still processing. Please wait a moment and try again.');
        return;
      }

      await onSuccess();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Card payment failed.');
    } finally {
      setPaying(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{
          layout: 'tabs',
          paymentMethodOrder: ['card', 'klarna', 'afterpay_clearpay'],
          fields: {
            billingDetails: {
              name: 'auto',
            },
          },
        }}
      />
      <button
        type="submit"
        disabled={!stripe || !elements || paying || disabled}
        className="w-full flex items-center justify-center gap-2 py-4 bg-charcoal hover:bg-charcoal-light disabled:bg-gray-300 text-white font-semibold rounded-xl transition-colors"
      >
        {paying && <Loader2 size={18} className="animate-spin" />}
        {paying ? 'Processing...' : `Pay ${amountLabel}`}
      </button>
    </form>
  );
}

export default function StripePaymentForm({
  clientSecret,
  amountLabel,
  publishableKey,
  disabled,
  onSuccess,
  onError,
}: StripePaymentFormProps) {
  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey],
  );

  if (!stripePromise) {
    return (
      <p className="text-sm text-red-600">
        Stripe publishable key is missing. Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... to .env.local or Supabase site settings and restart the dev server.
      </p>
    );
  }

  const options: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#c45c26',
        borderRadius: '12px',
        fontSizeBase: '16px',
        spacingUnit: '5px',
      },
      rules: {
        '.Input': {
          border: '1px solid #d1d5db',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
          padding: '14px',
        },
        '.Input:focus': {
          border: '2px solid #c45c26',
          boxShadow: '0 0 0 3px rgba(196, 92, 38, 0.12)',
        },
        '.Label': {
          fontWeight: '600',
          color: '#2f2a26',
          marginBottom: '8px',
        },
        '.Tab': {
          border: '1px solid #d1d5db',
          padding: '12px',
        },
        '.Tab--selected': {
          border: '2px solid #c45c26',
          boxShadow: '0 0 0 3px rgba(196, 92, 38, 0.10)',
        },
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentFormInner
        amountLabel={amountLabel}
        publishableKey={publishableKey}
        disabled={disabled}
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  );
}
