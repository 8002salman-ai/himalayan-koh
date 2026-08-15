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
import { decodePackingProfileTag } from './packingProfileTag';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Products are keyed by UUID. A line item whose id is not a UUID (stale
 * guest cart data, a manually-entered row, etc.) would make PostgREST throw
 * "invalid input syntax for type uuid" and kill the whole rates fetch.
 * Filter them out here so the item still rates via its weight fallback.
 */
function isValidUuid(value: string | undefined | null): boolean {
  return typeof value === 'string' && UUID_RE.test(value.trim());
}

export async function enrichRatesLineItems(
  supabase: SupabaseClient<Database>,
  lineItems: RatesLineItem[],
): Promise<PackingLineItem[]> {
  const productIds = [
    ...new Set(
      lineItems
        .map((item) => item.productId)
        .filter((id): id is string => Boolean(id) && isValidUuid(id)),
    ),
  ];

  const productById = new Map<
    string,
    { slug: string; name: string; weightLbs: number | null; tags: unknown }
  >();
  const packingByProductId = new Map<string, ProductPackingProfile>();

  if (productIds.length > 0) {
    const [{ data: products, error: productsError }, packingResult] = await Promise.all([
      supabase
        .from('products')
        .select('id, slug, name, weight, weight_unit, tags')
        .in('id', productIds),
      // The migration can be applied after code deployment. Until then, packing
      // profiles encoded in product tags keep live checkout and labels working.
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
        tags: unknown;
      };
      const weightLbs = toWeightLbs(product.weight, product.weight_unit);
      productById.set(product.id, {
        slug: product.slug,
        name: product.name,
        weightLbs,
        tags: product.tags,
      });

      const tagProfile = decodePackingProfileTag(product.id, product.tags);
      if (tagProfile) packingByProductId.set(product.id, tagProfile);
    }

    if (packingResult.error && packingResult.error.code !== '42P01') {
      throw new Error(packingResult.error.message || 'Unable to load product packing profiles.');
    }

    for (const row of packingResult.data || []) {
      const profile = mapProductPackingProfile(row);
      // The normalized database row is authoritative once the migration exists.
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
