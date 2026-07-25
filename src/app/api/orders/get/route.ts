import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';
import { checkRateLimit } from '@/lib/rateLimit';

// Server-mediated order lookup (admin client, bypasses RLS) — used by
// ordersApi.getOrderById() from the browser instead of a direct anon
// Supabase query. Guest orders (user_id IS NULL) previously relied on a
// blanket "Anon can view guest orders" RLS policy so the browser could read
// them back directly; that policy let anyone holding the public anon key
// enumerate every guest order via the REST API, not just the one order this
// page already knows the ID of. Routing the read through this endpoint lets
// that RLS policy be dropped (see the matching migration) while preserving
// the exact same guest "know the order ID, see the order" capability.
async function resolveUserId(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  if (!token) return null;

  const supabase = getSupabaseAdmin();
  const { data: userData, error } = await supabase.auth.getUser(token);
  if (error || !userData.user) {
    return null;
  }

  return userData.user.id;
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = checkRateLimit(`orders-get:${ip}`, { limit: 30, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const orderId = typeof record.orderId === 'string' ? record.orderId.trim() : '';
  if (!orderId) {
    return NextResponse.json({ error: 'orderId is required.' }, { status: 400 });
  }

  const userId = await resolveUserId(request);

  try {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('orders')
      .select(`*, order_items(*)`)
      .eq('id', orderId);

    // A logged-in caller only ever gets back their own order — a signed-in
    // request can't be used to read someone else's order by guessing its ID.
    // Unverified/guest callers are restricted to orders with no owner at all
    // (the same guest-checkout-confirmation capability this replaces) —
    // never a bare id match, or any order could be read by anyone who
    // guesses/knows its id, authenticated-owned or not.
    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.is('user_id', null);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Order lookup failed:', error);
    return NextResponse.json({ error: 'Unable to load order.' }, { status: 500 });
  }
}
