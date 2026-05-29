import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import type { RatesLineItem } from '../types';
import type { PackingLineItem } from './buildParcels';

export async function enrichRatesLineItems(
  supabase: SupabaseClient<Database>,
  lineItems: RatesLineItem[],
): Promise<PackingLineItem[]> {
  const productIds = [
    ...new Set(lineItems.map((item) => item.productId).filter((id): id is string => Boolean(id))),
  ];

  const productById = new Map<string, { slug: string; name: string; weightLbs: number | null }>();

  if (productIds.length > 0) {
    const { data, error } = await supabase
      .from('products')
      .select('id, slug, name, weight, weight_unit')
      .in('id', productIds);

    if (error) throw error;

    for (const row of data || []) {
      const product = row as {
        id: string;
        slug: string;
        name: string;
        weight: number | null;
        weight_unit: string | null;
      };
      const weightLbs =
        product.weight && product.weight > 0
          ? product.weight_unit?.toLowerCase() === 'kg'
            ? Math.round(product.weight * 2.20462 * 100) / 100
            : product.weight
          : null;
      productById.set(product.id, { slug: product.slug, name: product.name, weightLbs });
    }
  }

  return lineItems
    .filter((item) => item.quantity > 0)
    .map((item) => {
      const fromDb = item.productId ? productById.get(item.productId) : undefined;
      return {
        productId: item.productId,
        quantity: item.quantity,
        slug: fromDb?.slug ?? '',
        name: fromDb?.name ?? '',
        weightLbs: fromDb?.weightLbs ?? null,
      };
    });
}
