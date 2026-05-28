import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const root = process.cwd();
const envPath = path.join(root, '.env.local');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.error('Missing .env.local — copy .env.example to .env.local and add your Shippo keys.');
  process.exit(1);
}

const checks = [
  ['SHIPPO_API_KEY', process.env.SHIPPO_API_KEY],
  ['SHIPPO_FROM_NAME', process.env.SHIPPO_FROM_NAME],
  ['SHIPPO_FROM_STREET1', process.env.SHIPPO_FROM_STREET1],
  ['SHIPPO_FROM_CITY', process.env.SHIPPO_FROM_CITY],
  ['SHIPPO_FROM_STATE', process.env.SHIPPO_FROM_STATE],
  ['SHIPPO_FROM_ZIP', process.env.SHIPPO_FROM_ZIP],
  ['NEXT_PUBLIC_SHIPPO_ENABLED', process.env.NEXT_PUBLIC_SHIPPO_ENABLED],
];

let failed = false;
for (const [name, value] of checks) {
  const ok = Boolean(value && String(value).trim().length > 0);
  console.log(`${ok ? 'OK' : 'MISSING'}  ${name}`);
  if (!ok) failed = true;
}

if (failed) {
  console.log('\nGet a test API key from https://apps.goshippo.com/ and set warehouse address vars.');
  process.exit(1);
}

const port = process.env.PORT || '3000';
const base = (process.env.NEXT_PUBLIC_SITE_URL || `http://localhost:${port}`).replace(/\/$/, '');

console.log(`\nTesting POST ${base}/api/shippo/rates ...`);

const response = await fetch(`${base}/api/shippo/rates`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'shippo-check@example.com',
    address: {
      fullName: 'Test Customer',
      addressLine1: '965 Mission St',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94103',
      country: 'US',
    },
    items: [{ productId: 'demo', quantity: 1, weightLbs: 2 }],
  }),
});

const body = await response.json().catch(() => ({}));
if (!response.ok) {
  console.error(`FAIL  HTTP ${response.status}: ${body.error || JSON.stringify(body)}`);
  console.error('Restart dev server after editing .env.local: npm run dev:clean');
  process.exit(1);
}

const rateCount = Array.isArray(body.rates) ? body.rates.length : 0;
console.log(`OK    Received ${rateCount} shipping rate(s)`);
if (rateCount > 0) {
  const cheapest = body.rates[0];
  console.log(`OK    Cheapest: ${cheapest.provider} ${cheapest.serviceName} — $${Number(cheapest.amount).toFixed(2)}`);
}
console.log('\nShippo is ready. Run migration 008_shippo_shipping.sql if labels fail in admin.');
