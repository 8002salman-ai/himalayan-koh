import { NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/errors';
import { serverCreatePurchaseRequest, type CreatePurchaseRequestData } from '@/lib/wholesale/serverCreatePurchaseRequest';
import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';

function parseBody(body: unknown): { ok: true; data: CreatePurchaseRequestData } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Invalid request body.' };
  }
  const record = body as Record<string, unknown>;
  const shippingAddress = record.shippingAddress;
  if (!shippingAddress || typeof shippingAddress !== 'object') {
    return { ok: false, error: 'Shipping address is required.' };
  }
  return { ok: true, data: body as CreatePurchaseRequestData };
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Sign in as an approved dealer to submit a purchase request.' }, { status: 401 });
  }
  const token = authHeader.slice(7).trim();

  const supabase = getSupabaseAdmin();
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = parseBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const purchaseRequest = await serverCreatePurchaseRequest(parsed.data, { userId: userData.user.id });
    return NextResponse.json(purchaseRequest);
  } catch (error) {
    console.error('Create purchase request failed:', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Unable to submit purchase request.') },
      { status: 500 }
    );
  }
}
