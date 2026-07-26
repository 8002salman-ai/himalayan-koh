import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import { toWeightLbs } from '@/lib/products/shippingWeight';
import type { RatesLineItem } from '../types';
import type { PackingLineItem } from './buildParcels';
import {
  mapProductPackingProfile,
  type ProductPackingProfile,
  type ProductPackingProfileRow,
} from './productPackingProfile';

export async function enrichRatesLineItems(
  supabase: SupabaseClient<Database>,
  lineItems: RatesLineItem[],
): Promise<PackingLineItem[]> {
  const productIds = [
    ...new Set(lineItems.map((item) => item.productId).filter((id): id is string => Boolean(id))),
  ];

  const productById = new Map<string, { slug: string; name: string; weightLbs: number | null }>();
  const packingByProductId = new Map<string, ProductPackingProfile>();

  if (productIds.length > 0) {
    const [{ data: products, error: productsError }, packingResult] = await Promise.all([
      supabase
        .from('products')
        .select('id, slug, name, weight, weight_unit')
        .in('id', productIds),
      // The generated database type can lag one migration behind. The cast is
      // isolated here while the runtime table remains fully server-controlled.
      (supabase as unknown as {
        from: (table: string) => {
          select: (columns: string) => {
            in: (column: string, values: string[]) => Promise<{
              data: ProductPackingProfileRow[] | null;
              error: { code?: string; message?: string } | null;
            }>;
          };
        };
      })
        .from('product_packing_profiles')
        .select('*')
        .in('product_id', productIds),
    ]);

    if (productsError) throw productsError;

    for (const row of products || []) {
      const product = row as {
        id: string;
        slug: string;
        name: string;
        weight: number | null;
        weight_unit: string | null;
      };
      const weightLbs = toWeightLbs(product.weight, product.weight_unit);
      productById.set(product.id, { slug: product.slug, name: product.name, weightLbs });
    }

    if (packingResult.error && packingResult.error.code !== '42P01') {
      throw new Error(packingResult.error.message || 'Unable to load product packing profiles.');
    }

    for (const row of packingResult.data || []) {
      const profile = mapProductPackingProfile(row);
      packingByProductId.set(profile.productId, profile);
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
        weightLbs: fromDb?.weightLbs ?? item.weightLbs ?? null,
        packingProfile: item.productId ? packingByProductId.get(item.productId) : undefined,
      };
    });
}
