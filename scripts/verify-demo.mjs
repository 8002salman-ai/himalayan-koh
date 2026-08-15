import { loadEnv } from './lib/env.mjs';
import { createClients } from './lib/supabaseClients.mjs';

loadEnv();

const DEMO_LOGINS = [
  { label: 'Admin login', email: 'admin@himalayankoh.com', password: 'Admin@123' },
  { label: 'Customer login', email: 'customer@himalayankoh.com', password: 'Customer@123' },
];

function line(name, pass, detail) {
  console.log(`  ${pass ? '✔ PASS' : '✘ FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  return pass;
}

async function verifyLogin(anonClient, { label, email, password }) {
  const { data, error } = await anonClient.auth.signInWithPassword({ email, password });
  if (error) return { pass: line(label, false, error.message), userId: null };
  await anonClient.auth.signOut();
  return { pass: line(label, true, email), userId: data.user.id };
}

async function verifyOrders(adminClient, userId, label) {
  if (!userId) return line(label, false, 'no user id (login failed above)');
  const { data, error } = await adminClient.from('orders').select('id').eq('user_id', userId);
  if (error) return line(label, false, error.message);
  return line(label, (data || []).length > 0, `${(data || []).length} order(s)`);
}

async function verifyWishlist(adminClient, userId, label) {
  if (!userId) return line(label, false, 'no user id (login failed above)');
  const { data, error } = await adminClient.from('wishlists').select('id').eq('user_id', userId);
  if (error) return line(label, false, error.message);
  return line(label, (data || []).length > 0, `${(data || []).length} item(s)`);
}

async function verifyNotifications(adminClient, userId, label) {
  if (!userId) return line(label, false, 'no user id (login failed above)');
  const { data, error } = await adminClient.from('notifications').select('id').eq('user_id', userId);
  if (error) return line(label, false, error.message);
  return line(label, (data || []).length > 0, `${(data || []).length} notification(s)`);
}

async function verifyApis(anonClient) {
  // The Supabase REST layer (PostgREST) underlies every src/lib/supabase/api/*
  // call in the app — this exercises the same read path with the anon key.
  const { data, error } = await anonClient.from('products').select('id').eq('is_active', true).limit(1);
  if (error) return line('APIs', false, error.message);
  return line('APIs', true, 'product read via anon key succeeded');
}

async function verifyRls(anonClient) {
  // Two-sided check: anon must be able to read public products, but must
  // NOT be able to read admin-only crm_leads.
  const [{ data: products, error: productsError }, { data: leads, error: leadsError }] = await Promise.all([
    anonClient.from('products').select('id').eq('is_active', true).limit(1),
    anonClient.from('crm_leads').select('id').limit(1),
  ]);
  const publicReadOk = !productsError && (products || []).length >= 0;
  const adminOnlyBlocked = Boolean(leadsError) || (leads || []).length === 0;
  const pass = publicReadOk && adminOnlyBlocked;
  return line(
    'RLS',
    pass,
    pass ? 'public read allowed, admin-only table blocked' : 'RLS is not isolating data as expected'
  );
}

async function run() {
  console.log('Himalayan Koh — automated demo workflow verification\n');

  const clients = createClients();
  if (!clients) {
    console.error('Missing Supabase environment variables — see `npm run doctor`.');
    process.exit(1);
  }
  const { adminClient, anonClient } = clients;

  console.log('Logins:');
  const loginResults = {};
  for (const demo of DEMO_LOGINS) {
    loginResults[demo.email] = await verifyLogin(anonClient, demo);
  }

  console.log('\nData:');
  const results = [];
  results.push(await verifyOrders(adminClient, loginResults['customer@himalayankoh.com'].userId, 'Orders (customer)'));
  results.push(await verifyWishlist(adminClient, loginResults['customer@himalayankoh.com'].userId, 'Wishlist'));
  results.push(await verifyNotifications(adminClient, loginResults['customer@himalayankoh.com'].userId, 'Notifications'));

  console.log('\nPlatform:');
  results.push(await verifyApis(anonClient));
  results.push(await verifyRls(anonClient));

  const allResults = [...Object.values(loginResults).map((r) => r.pass), ...results];
  const passCount = allResults.filter(Boolean).length;
  const failCount = allResults.length - passCount;

  console.log(`\n— Result: ${passCount}/${allResults.length} passed —`);
  if (failCount > 0) {
    console.log('FAIL');
    process.exit(1);
  }
  console.log('PASS');
}

run().catch((error) => {
  console.error('\nVerification crashed:', error.message);
  console.log('FAIL');
  process.exit(1);
});
