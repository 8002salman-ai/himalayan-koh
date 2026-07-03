import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const root = process.cwd();
const envPath = path.join(root, '.env.local');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.error('Missing .env.local — copy .env.example to .env.local and add your test keys.');
  process.exit(1);
}

const checks = [
  ['NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL],
  ['NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY],
  ['SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY],
  ['STRIPE_SECRET_KEY', process.env.STRIPE_SECRET_KEY],
  [
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.VITE_STRIPE_PUBLISHABLE_KEY,
  ],
];

let failed = false;
for (const [name, value] of checks) {
  const ok = Boolean(value && String(value).trim().length > 8);
  console.log(`${ok ? 'OK' : 'MISSING'}  ${name}`);
  if (!ok) failed = true;
}

const sk = process.env.STRIPE_SECRET_KEY || '';
const pk =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
if (sk && !sk.startsWith('sk_test_')) {
  console.warn('WARN  STRIPE_SECRET_KEY is not sk_test_ — use test keys for local dev.');
}
if (pk && !pk.startsWith('pk_test_')) {
  console.warn('WARN  Publishable key is not pk_test_ — use test keys for local dev.');
}

if (failed) {
  console.log('\nAdd keys from https://dashboard.stripe.com/test/apikeys and Supabase project settings.');
  process.exit(1);
}

// Calls the Stripe API directly (not this app's /api/stripe/create-payment-intent
// route) — that route now requires a real orderId and prices exclusively from
// orders.total, by design, so it can't be smoke-tested with a fake line item.
console.log('\nTesting Stripe API connectivity with STRIPE_SECRET_KEY ...');

const { default: Stripe } = await import('stripe');
const stripe = new Stripe(sk);

try {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: 100,
    currency: 'usd',
    automatic_payment_methods: { enabled: true },
    description: 'himalayan-koh check-stripe-setup diagnostic (not charged)',
  });
  await stripe.paymentIntents.cancel(paymentIntent.id);
  console.log('OK    PaymentIntent created and cancelled:', paymentIntent.id);
  console.log('OK    Mode:', sk.startsWith('sk_live_') ? 'live' : 'test');
  console.log('\nStripe is ready. Test card: 4242 4242 4242 4242 · any future expiry · any CVC.');
} catch (error) {
  console.error('FAIL  Stripe API call failed:', error.message);
  process.exit(1);
}
