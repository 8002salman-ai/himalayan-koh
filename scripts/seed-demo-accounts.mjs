import { loadEnv, missingRequiredVars } from './lib/env.mjs';
import { createClients } from './lib/supabaseClients.mjs';

loadEnv();

// Bump this whenever the shape of seeded demo data changes (new accounts,
// new demo orders/documents, etc.) — `npm run info` reports it so it's
// obvious which seed shape a given environment was last set up with.
export const SEED_VERSION = '1.1.0';

// This app's schema only distinguishes profiles.role = 'customer' | 'admin'
// (see supabase/migrations/004_auth_profile_roles.sql). There is no
// super_admin/manager/sales_rep enum value — Manager and Sales
// Representative below are seeded as role='admin' with a descriptive
// full_name, since that is the only role that actually grants elevated
// access in this codebase (AdminRoute checks profile.role === 'admin'
// only, and adminDealerApi.listSalesReps() queries role === 'admin' too).
const demoAccounts = [
  {
    email: 'admin@himalayankoh.com',
    password: 'Admin@123',
    role: 'admin',
    fullName: 'Himalayan Koh Super Admin',
    phone: '(832) 224-6466',
  },
  {
    email: 'manager@himalayankoh.com',
    password: 'Manager@123',
    role: 'admin',
    fullName: 'Himalayan Koh Manager',
    phone: '(832) 224-6466',
  },
  {
    email: 'sales@himalayankoh.com',
    password: 'Sales@123',
    role: 'admin',
    fullName: 'Himalayan Koh Sales Representative',
    phone: '(832) 224-6466',
  },
  {
    email: 'customer@himalayankoh.com',
    password: 'Customer@123',
    role: 'customer',
    fullName: 'Demo Customer',
    phone: '(832) 224-6466',
  },
];

// =====================================================================
// DEMO WHOLESALE / DEALER ACCOUNTS
// =====================================================================
// DEV/DEMO ONLY. This script is never wired into `npm run build` or any
// deploy step, so it can only ever run if a human deliberately invokes it
// against a specific Supabase project's credentials — that invocation is
// the safety boundary. It bypasses the real dealer approval workflow on
// purpose: the dealer_applications row is inserted with status "approved"
// directly, clearly labeled as a demo account in its notes field.
// =====================================================================
const demoDealerConfigs = [
  {
    email: 'dealer@himalayankoh.com',
    password: 'Dealer@123',
    fullName: 'Demo Gold Wholesaler',
    phone: '(832) 555-0100',
    businessName: 'Himalayan Koh Demo Wholesale LLC',
  },
  {
    email: 'demo@dealer.himalayankoh.com',
    password: 'Demo@12345',
    fullName: 'Demo Wholesale Dealer',
    phone: '(832) 555-0101',
    businessName: 'Demo Ranch Supply LLC',
  },
];

/**
 * Resolve Supabase env vars and build the admin (service role) + anon
 * clients used for seeding. Returns null (and prints exactly which
 * variable is missing) instead of throwing, so callers like setup.mjs
 * can decide how to react.
 */
export function createSeedClients() {
  const missing = missingRequiredVars();
  if (missing.length > 0) {
    console.error('Missing required environment variable(s):');
    for (const name of missing) console.error(`  - ${name}`);
    return null;
  }
  return createClients();
}

/**
 * Seeds every demo account and its demo data. Idempotent — safe to run
 * any number of times (upsert throughout, never inserts duplicates).
 * Returns a structured summary so callers can report exactly what
 * happened rather than assuming success.
 */
export async function seedAll({ adminClient, anonClient }) {
  const summary = {
    accounts: [],
    customer: { orders: 0, wishlist: 0, notifications: 0 },
    dealers: [],
  };

  const seededUsers = {};
  for (const account of demoAccounts) {
    const user = await upsertAuthUser(adminClient, account);
    await upsertProfile(adminClient, user.id, account);
    await verifyLogin(anonClient, account);
    seededUsers[account.email] = user;
    summary.accounts.push({ email: account.email, role: account.role });
  }
  console.log('Demo authentication accounts are ready.');

  const customerResult = await seedCustomerDemoData(adminClient, seededUsers['customer@himalayankoh.com']);
  summary.customer = customerResult;

  for (const config of demoDealerConfigs) {
    const dealerResult = await seedDemoDealer(adminClient, anonClient, config);
    summary.dealers.push(dealerResult);
  }

  return summary;
}

async function seedCustomerDemoData(adminClient, user) {
  const result = { orders: 0, wishlist: 0, notifications: 0 };
  if (!user) return result;

  const { data: products, error: productsError } = await adminClient
    .from('products')
    .select('id, name, price, thumbnail, images')
    .eq('is_active', true)
    .limit(6);

  if (productsError) throw productsError;
  if (!products || products.length === 0) {
    console.warn('No active products found — skipping customer demo data.');
    return result;
  }

  for (const product of products.slice(0, 3)) {
    await adminClient
      .from('wishlists')
      .upsert({ user_id: user.id, product_id: product.id }, { onConflict: 'user_id,product_id' });
  }
  result.wishlist = Math.min(3, products.length);
  console.log('Seeded demo customer wishlist.');

  const shippingAddress = {
    fullName: 'Demo Customer',
    address_line1: '12620 FM 1960 W Ste A-4',
    city: 'Houston',
    state: 'Texas',
    postal_code: '77065',
    country: 'United States',
  };

  const demoOrders = [
    { status: 'delivered', paymentStatus: 'paid', daysAgo: 30 },
    { status: 'shipped', paymentStatus: 'paid', daysAgo: 5 },
  ];

  for (let orderIndex = 0; orderIndex < demoOrders.length; orderIndex += 1) {
    const demoOrder = demoOrders[orderIndex];
    const items = products.slice(orderIndex, orderIndex + 2);
    const quantity = 1;
    const unitPrices = items.map((p) => p.price);
    const subtotal = unitPrices.reduce((sum, price) => sum + price * quantity, 0);
    const shippingCost = subtotal >= 50 ? 0 : 9.95;
    const total = subtotal + shippingCost;
    const createdAt = new Date(Date.now() - demoOrder.daysAgo * 24 * 60 * 60 * 1000).toISOString();

    const { data: order, error: orderError } = await adminClient
      .from('orders')
      .insert({
        user_id: user.id,
        email: 'customer@himalayankoh.com',
        status: demoOrder.status,
        payment_status: demoOrder.paymentStatus,
        subtotal,
        shipping_cost: shippingCost,
        tax_amount: 0,
        discount_amount: 0,
        total,
        shipping_address: shippingAddress,
        billing_address: shippingAddress,
        notes: 'Demo customer order (seeded for testing).',
        created_at: createdAt,
        updated_at: createdAt,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    const orderItems = items.map((p, i) => ({
      order_id: order.id,
      product_id: p.id,
      product_name: p.name,
      product_image: p.thumbnail || p.images?.[0] || null,
      quantity,
      unit_price: unitPrices[i],
      total_price: unitPrices[i] * quantity,
    }));

    const { error: itemsError } = await adminClient.from('order_items').insert(orderItems);
    if (itemsError) throw itemsError;
    result.orders += 1;
  }
  console.log(`Seeded ${result.orders} demo customer orders with line items.`);

  const demoNotifications = [
    { type: 'order', title: 'Order delivered', message: 'Your recent order has been delivered. We hope you love it!' },
    { type: 'promotion', title: 'Welcome offer', message: 'Use code HKWELCOME10 for 10% off your next order.' },
  ];
  for (const note of demoNotifications) {
    await adminClient.from('notifications').insert({
      user_id: user.id,
      type: note.type,
      title: note.title,
      message: note.message,
    });
    result.notifications += 1;
  }
  console.log('Seeded demo customer notifications.');

  return result;
}

async function seedDemoDealer(adminClient, anonClient, config) {
  console.warn(`⚠️  Seeding DEMO WHOLESALE ACCOUNT (${config.email}) — development/testing use only.`);

  const result = { email: config.email, documents: 0, pricing: 0, wishlist: 0, orders: 0, notifications: 0 };

  const demoDealer = {
    email: config.email,
    password: config.password,
    fullName: config.fullName,
    phone: config.phone,
    role: 'customer', // profiles.role is intentionally untouched — dealer
                       // access is granted via an approved dealer_applications
                       // row, matching this app's actual RBAC design.
  };

  const user = await upsertAuthUser(adminClient, demoDealer);
  await upsertProfile(adminClient, user.id, demoDealer);

  const { data: application, error: appError } = await adminClient
    .from('dealer_applications')
    .upsert(
      {
        user_id: user.id,
        business_name: config.businessName,
        owner_name: demoDealer.fullName,
        business_email: demoDealer.email,
        phone: demoDealer.phone,
        website: 'https://demo-ranchsupply.example.com',
        business_type: 'LLC',
        years_in_business: 6,
        country: 'United States',
        state: 'Texas',
        city: 'Houston',
        zip: '77065',
        address: '12620 FM 1960 W Ste A-4',
        monthly_purchase: '$5,000 - $10,000',
        products_interested: ['Salt for Cattle', 'Salt Lick for Horses'],
        sales_channels: ['Store', 'Website'],
        notes: 'DEMO ACCOUNT — created for development/testing only. Not a real wholesale application; bypasses the approval workflow intentionally.',
        status: 'approved',
        status_reason: 'Auto-approved demo account for testing.',
        dealer_level: 'gold',
        credit_terms: 30,
        tax_exempt: true,
        credit_limit: 15000,
        reviewed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  if (appError) throw appError;
  console.log(`Upserted approved dealer application: ${demoDealer.email} (Gold tier)`);

  await adminClient.from('dealer_audit_log').insert({
    application_id: application.id,
    action: 'demo_account_seeded',
    details: { source: 'scripts/seed-demo-accounts.mjs' },
  });

  // Demo documents (metadata only — no real files in storage; the portal
  // only lists file name + verification status, it doesn't serve the file).
  const demoDocuments = [
    { document_type: 'reseller_permit', file_name: 'DEMO-RESALE-10001.pdf' },
    { document_type: 'business_license', file_name: 'demo-business-license.pdf' },
    { document_type: 'tax_certificate', file_name: 'demo-tax-certificate.pdf' },
  ];

  for (const doc of demoDocuments) {
    const { data: existingDoc } = await adminClient
      .from('dealer_documents')
      .select('id')
      .eq('application_id', application.id)
      .eq('document_type', doc.document_type)
      .maybeSingle();

    if (existingDoc) {
      result.documents += 1;
      continue;
    }

    await adminClient.from('dealer_documents').insert({
      application_id: application.id,
      document_type: doc.document_type,
      file_path: `${user.id}/${doc.document_type}-demo.pdf`,
      file_name: doc.file_name,
      mime_type: 'application/pdf',
      file_size: 102400,
      is_verified: true,
      verified_at: new Date().toISOString(),
    });
    result.documents += 1;
  }
  console.log('Seeded demo dealer documents (pre-verified).');

  // Pick a handful of real catalog products to seed orders/wishlist against,
  // and make sure they have a visible dealer price (25% off retail) so the
  // wholesale catalog shows genuine wholesale pricing for this demo tier.
  const { data: products, error: productsError } = await adminClient
    .from('products')
    .select('id, name, price, dealer_price, thumbnail, images')
    .eq('is_active', true)
    .limit(6);

  if (productsError) throw productsError;
  if (!products || products.length === 0) {
    console.warn('No active products found — skipping demo orders/wishlist seed.');
    return result;
  }

  for (const product of products) {
    if (product.dealer_price == null) {
      await adminClient
        .from('products')
        .update({ dealer_price: Number((product.price * 0.75).toFixed(2)) })
        .eq('id', product.id);
    }
    result.pricing += 1;
  }
  console.log(`Ensured dealer pricing on ${result.pricing} demo catalog products.`);

  // Wishlist ("saved / favorite products")
  for (const product of products.slice(0, 3)) {
    await adminClient
      .from('wishlists')
      .upsert({ user_id: user.id, product_id: product.id }, { onConflict: 'user_id,product_id' });
  }
  result.wishlist = Math.min(3, products.length);
  console.log('Seeded demo saved/favorite products.');

  // Demo order history (bulk order history / invoices / statements / stats)
  const demoOrders = [
    { status: 'delivered', paymentStatus: 'paid', daysAgo: 45 },
    { status: 'delivered', paymentStatus: 'paid', daysAgo: 20 },
    { status: 'shipped', paymentStatus: 'paid', daysAgo: 6 },
    { status: 'processing', paymentStatus: 'paid', daysAgo: 1 },
  ];

  const shippingAddress = {
    fullName: demoDealer.fullName,
    address_line1: '12620 FM 1960 W Ste A-4',
    city: 'Houston',
    state: 'Texas',
    postal_code: '77065',
    country: 'United States',
  };

  for (let orderIndex = 0; orderIndex < demoOrders.length; orderIndex += 1) {
    const demoOrder = demoOrders[orderIndex];
    const items = products.slice(0, 2 + (orderIndex % 2));
    const quantity = 10 + orderIndex * 5;
    const unitPrices = items.map((p) => p.dealer_price ?? Number((p.price * 0.75).toFixed(2)));
    const subtotal = unitPrices.reduce((sum, price) => sum + price * quantity, 0);
    const shippingCost = 0;
    const taxAmount = 0;
    const total = subtotal + shippingCost + taxAmount;
    const createdAt = new Date(Date.now() - demoOrder.daysAgo * 24 * 60 * 60 * 1000).toISOString();

    const { data: order, error: orderError } = await adminClient
      .from('orders')
      .insert({
        user_id: user.id,
        email: demoDealer.email,
        phone: demoDealer.phone,
        status: demoOrder.status,
        payment_status: demoOrder.paymentStatus,
        subtotal,
        shipping_cost: shippingCost,
        tax_amount: taxAmount,
        discount_amount: 0,
        total,
        shipping_address: shippingAddress,
        billing_address: shippingAddress,
        notes: 'Demo wholesale order (seeded for testing).',
        created_at: createdAt,
        updated_at: createdAt,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    const orderItems = items.map((p, i) => ({
      order_id: order.id,
      product_id: p.id,
      product_name: p.name,
      product_image: p.thumbnail || p.images?.[0] || null,
      quantity,
      unit_price: unitPrices[i],
      total_price: unitPrices[i] * quantity,
    }));

    const { error: itemsError } = await adminClient.from('order_items').insert(orderItems);
    if (itemsError) throw itemsError;
    result.orders += 1;
  }
  console.log(`Seeded ${result.orders} demo wholesale orders with line items.`);

  const demoNotifications = [
    { type: 'system', title: 'Welcome to your Wholesale Portal', message: 'Your Gold wholesale account is approved and ready — browse wholesale pricing and place your first order.' },
    { type: 'order', title: 'Order shipped', message: 'Your recent wholesale order has shipped and is on its way.' },
    { type: 'promotion', title: 'Wholesale Promotion', message: 'Order 50+ units this month to qualify for the next wholesale tier.' },
  ];
  for (const note of demoNotifications) {
    await adminClient.from('notifications').insert({
      user_id: user.id,
      type: note.type,
      title: note.title,
      message: note.message,
    });
    result.notifications += 1;
  }
  console.log('Seeded demo notifications.');

  await verifyLogin(anonClient, demoDealer);
  console.log(`✅ Demo wholesale account ready: ${config.email} / ${config.password}`);
  console.log('   Sign in at /dealer/login — it will land on /dealer/dashboard immediately (pre-approved).');

  return result;
}

async function upsertAuthUser(adminClient, account) {
  const existing = await findUserByEmail(adminClient, account.email);

  if (existing) {
    const { data, error } = await adminClient.auth.admin.updateUserById(existing.id, {
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: { full_name: account.fullName, role: account.role },
    });

    if (error) throw error;
    console.log(`Updated auth user: ${account.email}`);
    return data.user;
  }

  const { data, error } = await adminClient.auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true,
    user_metadata: { full_name: account.fullName, role: account.role },
  });

  if (error) throw error;
  console.log(`Created auth user: ${account.email}`);
  return data.user;
}

async function findUserByEmail(adminClient, email) {
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const found = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function upsertProfile(adminClient, userId, account) {
  const { error } = await adminClient
    .from('profiles')
    .upsert(
      {
        id: userId,
        email: account.email,
        full_name: account.fullName,
        phone: account.phone,
        role: account.role,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

  if (error) throw error;
  console.log(`Upserted ${account.role} profile: ${account.email}`);
}

async function verifyLogin(anonClient, account) {
  const { data, error } = await anonClient.auth.signInWithPassword({
    email: account.email,
    password: account.password,
  });

  if (error) throw error;

  const { data: profile, error: profileError } = await anonClient
    .from('profiles')
    .select('id,email,role')
    .eq('id', data.user.id)
    .single();

  if (profileError) throw profileError;
  if (profile.role !== account.role) {
    throw new Error(`Role verification failed for ${account.email}: expected ${account.role}, got ${profile.role}`);
  }

  await anonClient.auth.signOut();
  console.log(`Verified login and ${account.role} role: ${account.email}`);
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;

if (isMain) {
  const clients = createSeedClients();
  if (!clients) {
    console.error('\nSet the missing variable(s) above in .env.local and re-run.');
    process.exit(1);
  }

  seedAll(clients)
    .then(() => console.log('\nDemo authentication accounts are ready.'))
    .catch((error) => {
      console.error('\nSeeding failed:', error.message);
      process.exit(1);
    });
}
