import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';
import { checkRateLimit } from '@/lib/rateLimit';

/**
 * Self-service account deletion. Requires the caller's session (Bearer token)
 * AND their current password, then deletes the auth user. FK cascades remove
 * the profile, addresses, carts, wishlists and reviews; orders are retained
 * and anonymized (orders.user_id is ON DELETE SET NULL) so fulfilment history
 * stays auditable.
 */
export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = checkRateLimit(`account-delete:${ip}`, { limit: 5, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const { data: sessionUser, error: userError } = await admin.auth.getUser(token);
  if (userError || !sessionUser.user) {
    return NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const email = typeof record.email === 'string' ? record.email.trim().toLowerCase() : '';
  const password = typeof record.password === 'string' ? record.password : '';
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }
  if (sessionUser.user.email?.toLowerCase() !== email) {
    return NextResponse.json({ error: 'Email does not match this account.' }, { status: 403 });
  }

  // Re-verify the password with a plain anon client (the service-role client
  // does not authenticate credentials the same way).
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Account service is not configured.' }, { status: 503 });
  }

  const anon = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInError } = await anon.auth.signInWithPassword({ email, password });
  if (signInError) {
    return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 });
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(sessionUser.user.id);
  if (deleteError) {
    console.error('Account deletion failed:', deleteError);
    return NextResponse.json({ error: 'Unable to delete account. Please contact support.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
