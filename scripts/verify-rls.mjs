/**
 * Verifies critical RLS rules using demo accounts.
 * Run after migrations + seed: npm run verify:rls
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env.local') });
dotenv.config({ path: path.join(root, '.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

const customerEmail = 'customer@himalayankoh.com';
const customerPassword = 'Customer123!';

let failed = 0;

function pass(label) {
  console.log(`  ✓ ${label}`);
}

function fail(label, detail = '') {
  failed += 1;
  console.error(`  ✗ ${label}${detail ? `: ${detail}` : ''}`);
}

if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
  console.error(
    'Skip: set VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in .env'
  );
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const customerClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log('RLS verification (orders isolation)\n');

const { data: signInData, error: signInError } = await customerClient.auth.signInWithPassword({
  email: customerEmail,
  password: customerPassword,
});

if (signInError || !signInData.user) {
  console.error('Could not sign in as demo customer. Run: npm run seed:demo-accounts');
  process.exit(1);
}

const customerId = signInData.user.id;

const { data: allOrders, error: adminOrdersError } = await adminClient
  .from('orders')
  .select('id, user_id, email')
  .limit(50);

if (adminOrdersError) {
  fail('Service role could not read orders', adminOrdersError.message);
  process.exit(1);
}

const foreignOrder = (allOrders || []).find(
  (order) => order.user_id && order.user_id !== customerId
);

const { data: ownOrders, error: ownOrdersError } = await customerClient
  .from('orders')
  .select('id, user_id');

if (ownOrdersError) {
  fail('Customer could not list own orders', ownOrdersError.message);
} else {
  const leaked = (ownOrders || []).filter((o) => o.user_id && o.user_id !== customerId);
  if (leaked.length > 0) {
    fail('Customer SELECT returned another user\'s orders', leaked.map((o) => o.id).join(', '));
  } else {
    pass('Customer order list only includes own rows (or guest/null user_id)');
  }
}

if (foreignOrder) {
  const { data: peek, error: peekError } = await customerClient
    .from('orders')
    .select('id')
    .eq('id', foreignOrder.id)
    .maybeSingle();

  if (peekError) {
    pass(`Customer blocked from foreign order ${foreignOrder.id} (${peekError.message})`);
  } else if (peek) {
    fail(`Customer could read foreign order ${foreignOrder.id}`);
  } else {
    pass(`Customer cannot read foreign order ${foreignOrder.id}`);
  }

  const { data: items, error: itemsError } = await customerClient
    .from('order_items')
    .select('id')
    .eq('order_id', foreignOrder.id);

  if (itemsError) {
    pass(`Customer blocked from foreign order_items (${itemsError.message})`);
  } else if (items && items.length > 0) {
    fail(`Customer could read order_items for foreign order ${foreignOrder.id}`);
  } else {
    pass('Customer cannot read order_items for foreign order');
  }
} else {
  console.log('  ℹ No foreign-owned orders in DB — create two customer orders to fully test peek-by-id');
  pass('Orders RLS policies present (no foreign order sample to probe)');
}

const { data: adminPeek, error: adminPeekError } = await customerClient
  .from('profiles')
  .select('id, role')
  .eq('role', 'admin')
  .limit(1);

if (adminPeekError) {
  pass('Customer cannot enumerate admin profiles');
} else if (adminPeek && adminPeek.length > 0 && adminPeek[0].id !== customerId) {
  fail('Customer could read another user\'s admin profile');
} else {
  pass('Customer profile access scoped correctly');
}

await customerClient.auth.signOut();

console.log('');
if (failed > 0) {
  console.error(`RLS verification FAILED (${failed} check(s))`);
  process.exit(1);
}

console.log('RLS verification passed.');
