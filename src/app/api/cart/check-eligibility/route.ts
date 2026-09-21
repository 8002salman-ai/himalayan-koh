import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';
import { isRealCatalogProduct } from '@/lib/supabase/api/products';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const productId = typeof body.productId === 'string' ? body.productId.trim() : '';
    const quantity = Number(body.quantity);

    if (!productId || !Number.isInteger(quantity) || quantity <= 0) {
      return NextResponse.json({ error: 'A valid product and positive quantity are required.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: rawProduct, error } = await (supabase as any)
      .from('products')
      .select('id, name, price, is_active, tags, inventory(*)')
      .eq('id', productId)
      .maybeSingle();

    if (error) throw error;
    const product = rawProduct as {
      id: string;
      name: string;
      price: number;
      is_active: boolean;
      tags: string[] | null;
      inventory?: unknown;
    } | null;
    if (!product || !product.is_active || !isRealCatalogProduct(product)) {
      return NextResponse.json({ error: `${product?.name || 'This product'} is not available for purchase.` }, { status: 409 });
    }

    const inventory = Array.isArray(product.inventory) ? product.inventory[0] as Record<string, unknown> : product.inventory as Record<string, unknown> | undefined;
    if (inventory?.track_inventory && !inventory.allow_backorder) {
      const available = Math.max(0, Number(inventory.quantity || 0) - Number(inventory.reserved_quantity || 0));
      if (quantity > available) {
        return NextResponse.json({ error: `${product.name} has only ${available} available.` }, { status: 409 });
      }
    }

    if (!Number.isFinite(Number(product.price)) || Number(product.price) <= 0) {
      return NextResponse.json({ error: `${product.name} does not have a valid selling price.` }, { status: 409 });
    }

    return NextResponse.json({ ok: true, productId, quantity });
  } catch (error) {
    console.error('Cart eligibility check failed:', error);
    return NextResponse.json({ error: 'Unable to verify product availability right now.' }, { status: 500 });
  }
}
