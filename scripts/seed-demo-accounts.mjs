import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env.local') });
dotenv.config({ path: path.join(root, '.env') });

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY;

const demoAccounts = [
  {
    email: 'admin@himalayankoh.com',
    password: 'Admin123!',
    role: 'admin',
    fullName: 'Himalayan Koh Admin',
    phone: '(832) 224-6466',
  },
  {
    email: 'customer@himalayankoh.com',
    password: 'Customer123!',
    role: 'customer',
    fullName: 'Demo Customer',
    phone: '(832) 224-6466',
  },
];

if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
  console.error([
    'Missing Supabase environment variables.',
    'Required:',
    '- SUPABASE_URL or VITE_SUPABASE_URL',
    '- SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY',
    '- SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)',
  ].join('\n'));
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

for (const account of demoAccounts) {
  const user = await upsertAuthUser(account);
  await upsertProfile(user.id, account);
  await verifyLogin(account);
}

console.log('Demo authentication accounts are ready.');

// =====================================================================
// DEMO WHOLESALE / DEALER ACCOUNT
// =====================================================================
// DEV/DEMO ONLY. Never wired into `npm run build` or any deploy step —
// this only runs if explicitly invoked with SEED_DEMO_DEALER=true, so it
// can never be created by accident against a production database.
// It bypasses the real dealer approval workflow on purpose: the
// dealer_applications row is inserted with status "approved" directly,
// clearly labeled as a demo account in its notes field.
// =====================================================================

if (process.env.SEED_DEMO_DEALER === 'true') {
  await seedDemoDealer();
} else {
  console.log('Skipping demo dealer seed (set SEED_DEMO_DEALER=true to include it).');
}

async function seedDemoDealer() {
  console.warn('⚠️  Seeding DEMO WHOLESALE ACCOUNT — development/testing use only.');

  const demoDealer = {
    email: 'demo@dealer.himalayankoh.com',
    password: 'Demo@12345',
    fullName: 'Demo Wholesale Dealer',
    phone: '(832) 555-0100',
    role: 'customer', // profiles.role is intentionally untouched — dealer
                       // access is granted via an approved dealer_applications
                       // row, matching this app's actual RBAC design.
  };

  const user = await upsertAuthUser(demoDealer);
  await upsertProfile(user.id, demoDealer);

  const { data: application, error: appError } = await adminClient
    .from('dealer_applications')
    .upsert(
      {
        user_id: user.id,
        business_name: 'Demo Ranch Supply LLC',
        owner_name: 'Demo Wholesale Dealer',
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
        notes: 'DEMO ACCOUNT — created for development/testing only. Not a real dealer application; bypasses the approval workflow intentionally.',
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

    if (existingDoc) continue;

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
    return;
  }

  for (const product of products) {
    if (product.dealer_price == null) {
      await adminClient
        .from('products')
        .update({ dealer_price: Number((product.price * 0.75).toFixed(2)) })
        .eq('id', product.id);
    }
  }
  console.log(`Ensured dealer pricing on ${products.length} demo catalog products.`);

  // Wishlist ("saved / favorite products")
  for (const product of products.slice(0, 3)) {
    await adminClient
      .from('wishlists')
      .upsert({ user_id: user.id, product_id: product.id }, { onConflict: 'user_id,product_id' });
  }
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
  }
  console.log(`Seeded ${demoOrders.length} demo wholesale orders with line items.`);

  await verifyLogin(demoDealer);
  console.log('✅ Demo wholesale account ready: demo@dealer.himalayankoh.com / Demo@12345');
  console.log('   Sign in at /dealer/login — it will land on /dealer/dashboard immediately (pre-approved).');
}

async function upsertAuthUser(account) {
  const existing = await findUserByEmail(account.email);

  if (existing) {
    const { data, error } = await adminClient.auth.admin.updateUserById(existing.id, {
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: {
        full_name: account.fullName,
        role: account.role,
      },
    });

    if (error) throw error;
    console.log(`Updated auth user: ${account.email}`);
    return data.user;
  }

  const { data, error } = await adminClient.auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true,
    user_metadata: {
      full_name: account.fullName,
      role: account.role,
    },
  });

  if (error) throw error;
  console.log(`Created auth user: ${account.email}`);
  return data.user;
}

async function findUserByEmail(email) {
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) throw error;

    const found = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function upsertProfile(userId, account) {
  const { error } = await adminClient
    .from('profiles')
    .upsert({
      id: userId,
      email: account.email,
      full_name: account.fullName,
      phone: account.phone,
      role: account.role,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

  if (error) throw error;
  console.log(`Upserted ${account.role} profile: ${account.email}`);
}

async function verifyLogin(account) {
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
