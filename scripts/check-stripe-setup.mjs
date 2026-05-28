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

const port = process.env.PORT || '3000';
const base = (process.env.NEXT_PUBLIC_SITE_URL || `http://localhost:${port}`).replace(/\/$/, '');

console.log(`\nTesting POST ${base}/api/stripe/create-payment-intent ...`);

const response = await fetch(`${base}/api/stripe/create-payment-intent`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'stripe-check@example.com',
    couponCode: '',
    shippingMethod: 'standard',
    items: [{ id: 'check', name: 'Setup check', quantity: 1, price: 25 }],
  }),
});

const body = await response.json().catch(() => ({}));
if (!response.ok) {
  console.error(`FAIL  HTTP ${response.status}: ${body.error || JSON.stringify(body)}`);
  console.error('Restart dev server after editing .env.local: npm run dev:clean');
  process.exit(1);
}

console.log('OK    PaymentIntent created:', body.paymentIntentId);
console.log('OK    Mode:', body.mode);
console.log('\nStripe is ready. Test card: 4242 4242 4242 4242 · any future expiry · any CVC.');
