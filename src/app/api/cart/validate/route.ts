import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';
import { checkoutCartIssues } from '@/lib/orders/serverCreateOrder';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const requestedUserId = typeof body.userId === 'string' && body.userId.trim() ? body.userId.trim() : null;
    const sessionId = typeof body.cartSessionId === 'string' && body.cartSessionId.trim() ? body.cartSessionId.trim() : null;
    let userId: string | null = null;

    if (requestedUserId) {
      const authHeader = request.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase.auth.getUser(authHeader.slice(7).trim());
      if (error || data.user?.id !== requestedUserId) return NextResponse.json({ error: 'Invalid cart owner.' }, { status: 403 });
      userId = requestedUserId;
    }

    if (!userId && !sessionId) return NextResponse.json({ error: 'Cart session is required.' }, { status: 400 });
    const supabase = getSupabaseAdmin();
    let query = supabase.from('carts').select('id, cart_items(*, product:products(*, inventory(*)))');
    query = userId ? query.eq('user_id', userId) : query.eq('session_id', sessionId);
    const { data: cart, error } = await query.maybeSingle();
    if (error) throw error;
    if (!cart) return NextResponse.json({ ok: true, invalidItems: [] });

    const items = (cart as any).cart_items || [];
    const invalidItems = checkoutCartIssues(items);
    if (invalidItems.length > 0) {
      const ids = invalidItems.map((item) => item.cartItemId);
      const { error: deleteError } = await supabase.from('cart_items').delete().in('id', ids).eq('cart_id', (cart as any).id);
      if (deleteError) throw deleteError;
    }
    return NextResponse.json({ ok: true, invalidItems });
  } catch (error) {
    console.error('Cart validation failed:', error);
    return NextResponse.json({ error: 'Unable to validate your cart right now.' }, { status: 500 });
  }
}
