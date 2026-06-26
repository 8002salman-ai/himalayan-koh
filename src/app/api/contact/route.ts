import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';
import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = checkRateLimit(`contact:${ip}`, { limit: 5, windowMs: 60_000 });
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
  const name = typeof record.name === 'string' ? record.name.trim() : '';
  const email = typeof record.email === 'string' ? record.email.trim() : '';
  const phone = typeof record.phone === 'string' ? record.phone.trim() : '';
  const subject = typeof record.subject === 'string' ? record.subject.trim() : '';
  const message = typeof record.message === 'string' ? record.message.trim() : '';

  if (!name || !email || !subject || !message) {
    return NextResponse.json(
      { error: 'Name, email, subject, and message are required.' },
      { status: 400 }
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('contact_submissions').insert({
      name: name.slice(0, 200),
      email: email.slice(0, 300),
      phone: phone ? phone.slice(0, 50) : null,
      subject: subject.slice(0, 200),
      message: message.slice(0, 5000),
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact form submission failed:', error);
    return NextResponse.json(
      { error: 'Failed to submit message. Please try again.' },
      { status: 500 }
    );
  }
}
