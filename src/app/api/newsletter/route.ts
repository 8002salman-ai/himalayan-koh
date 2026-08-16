import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';
import { checkRateLimit } from '@/lib/rateLimit';

// The hand-written database.types.ts does not model every table with the full
// generated shape supabase-js expects, so server-side writes into newer tables
// use an untyped client (same convention as lib/settings/serverSettings.ts).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = checkRateLimit(`newsletter:${ip}`, { limit: 5, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const email = typeof record.email === 'string' ? record.email.trim().toLowerCase() : '';
  const source = typeof record.source === 'string' && record.source.trim()
    ? record.source.trim().slice(0, 100)
    : 'footer';

  if (!email) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  }
  if (email.length > 300 || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  try {
    const supabase: AnyClient = getSupabaseAdmin();
    // Idempotent subscribe: re-subscribing the same address keeps the original
    // row rather than erroring or duplicating.
    const { error } = await supabase.from('newsletter_subscribers').upsert(
      { email, source },
      { onConflict: 'email', ignoreDuplicates: true }
    );

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Newsletter subscription failed:', error);
    return NextResponse.json(
      { error: 'Unable to subscribe. Please try again.' },
      { status: 500 }
    );
  }
}
