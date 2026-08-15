import readline from 'readline';
import { loadEnv } from './lib/env.mjs';
import { createClients } from './lib/supabaseClients.mjs';
import { createSeedClients, seedAll } from './seed-demo-accounts.mjs';

loadEnv();

// The exact set of demo accounts this toolchain seeds. Reset ONLY ever
// touches data belonging to these specific emails — never a blanket
// delete across orders/wishlists/notifications, so it can never touch a
// real customer's data even if run against a shared project by mistake.
const DEMO_EMAILS = [
  'admin@himalayankoh.com',
  'manager@himalayankoh.com',
  'sales@himalayankoh.com',
  'customer@himalayankoh.com',
];

function confirm(question) {
  if (process.env.FORCE === 'true' || process.env.CI === 'true') return Promise.resolve(true);
  if (!process.stdin.isTTY) {
    console.error('Not running in an interactive terminal — re-run with FORCE=true to confirm non-interactively.');
    return Promise.resolve(false);
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim() === 'RESET');
    });
  });
}

async function findDemoUserIds(adminClient) {
  const ids = [];
  let page = 1;
  const perPage = 100;
  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    for (const user of data.users) {
      if (user.email && DEMO_EMAILS.includes(user.email.toLowerCase())) ids.push(user.id);
    }
    if (data.users.length < perPage) break;
    page += 1;
  }
  return ids;
}

async function deleteDemoData(adminClient, userIds) {
  if (userIds.length === 0) {
    console.log('No demo accounts found yet — nothing to delete.');
    return;
  }

  const { data: orders } = await adminClient.from('orders').select('id').in('user_id', userIds);
  const orderIds = (orders || []).map((o) => o.id);

  if (orderIds.length > 0) {
    await adminClient.from('order_items').delete().in('order_id', orderIds);
    await adminClient.from('orders').delete().in('id', orderIds);
    console.log(`  Deleted ${orderIds.length} demo order(s) and their line items.`);
  }

  await adminClient.from('wishlists').delete().in('user_id', userIds);
  console.log('  Deleted demo wishlist entries.');

  await adminClient.from('notifications').delete().in('user_id', userIds);
  console.log('  Deleted demo notifications.');

  console.log('  Kept: schema, migrations, storage buckets, and every non-demo row untouched.');
}

async function run() {
  console.log('⚠️  npm run reset — DEVELOPMENT ONLY');
  console.log('This deletes demo data for the following accounts, then re-seeds them fresh:');
  for (const email of DEMO_EMAILS) console.log(`  - ${email}`);
  console.log('\nSchema, migrations, and all other data are left untouched.');
  console.log('Nothing outside these specific demo accounts is ever touched.\n');

  const confirmed = await confirm('Type RESET to continue, or anything else to cancel: ');
  if (!confirmed) {
    console.log('Cancelled — nothing was changed.');
    process.exit(0);
  }

  const clients = createClients();
  if (!clients) {
    console.error('Missing Supabase environment variables — see `npm run doctor`.');
    process.exit(1);
  }

  console.log('\nDeleting existing demo data...');
  const userIds = await findDemoUserIds(clients.adminClient);
  await deleteDemoData(clients.adminClient, userIds);

  console.log('\nRe-seeding fresh demo data...');
  const seedClients = createSeedClients();
  if (!seedClients) {
    console.error('Could not build Supabase clients for re-seeding.');
    process.exit(1);
  }
  await seedAll(seedClients);

  console.log('\n✔ Fresh demo environment ready. Run `npm run verify` to confirm everything works.');
}

run().catch((error) => {
  console.error('\nReset failed:', error.message);
  process.exit(1);
});
