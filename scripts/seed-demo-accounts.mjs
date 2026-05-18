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
