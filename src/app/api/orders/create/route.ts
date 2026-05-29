import { NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/errors';
import { serverCreateOrder } from '@/lib/orders/serverCreateOrder';
import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';
import type { CreateOrderData, ShippingMethod } from '@/lib/supabase/api/orders';

type CreateOrderBody = CreateOrderData & {
  cartSessionId?: string;
};

function parseBody(body: unknown): { ok: true; data: CreateOrderBody } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Invalid request body.' };
  }

  const record = body as Record<string, unknown>;
  const email = typeof record.email === 'string' ? record.email.trim() : '';
  if (!email) {
    return { ok: false, error: 'Email is required.' };
  }

  const shippingAddress = record.shippingAddress;
  if (!shippingAddress || typeof shippingAddress !== 'object') {
    return { ok: false, error: 'Shipping address is required.' };
  }

  return { ok: true, data: body as CreateOrderBody };
}

async function resolveUserId(request: Request, bodyUserId?: string): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return bodyUserId || null;
  }

  const token = authHeader.slice(7).trim();
  if (!token) return bodyUserId || null;

  const supabase = getSupabaseAdmin();
  const { data: userData, error } = await supabase.auth.getUser(token);
  if (error || !userData.user) {
    return null;
  }

  return userData.user.id;
}

export async function POST(request: Request) {
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

  const { cartSessionId, ...orderData } = parsed.data;
  const userId = await resolveUserId(request, (parsed.data as { userId?: string }).userId);

  if (!userId && !cartSessionId?.trim()) {
    return NextResponse.json(
      { error: 'Cart session missing. Refresh the page and try again.' },
      { status: 400 }
    );
  }

  try {
    const order = await serverCreateOrder(
      {
        ...orderData,
        shippingMethod: (orderData.shippingMethod || 'standard') as ShippingMethod,
      },
      { userId, cartSessionId: cartSessionId?.trim() || null }
    );

    return NextResponse.json(order);
  } catch (error) {
    console.error('Create order failed:', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Unable to place order.') },
      { status: 500 }
    );
  }
}
