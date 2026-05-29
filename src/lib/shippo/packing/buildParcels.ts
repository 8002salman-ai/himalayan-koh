import type { ShippoParcelInput } from '../types';
import { UnsupportedPackingProductsError } from './errors';
import { resolvePackingRule } from './rules';

export interface PackingLineItem {
  productId?: string;
  quantity: number;
  slug: string;
  name: string;
}

function roundWeightLbs(value: number): number {
  return Math.max(0.1, Math.round(value * 100) / 100);
}

/**
 * Builds one Shippo parcel per shipping box using approved packing rules only.
 * Mixed SKUs produce separate boxes per product type; partial boxes use the same outer dimensions.
 */
export function buildParcelsFromPackingLineItems(items: PackingLineItem[]): ShippoParcelInput[] {
  if (items.length === 0) {
    throw new Error('At least one cart item is required for Shippo packing.');
  }

  const unsupported: { productId?: string; name: string; slug: string }[] = [];
  const parcels: ShippoParcelInput[] = [];

  for (const item of items) {
    if (item.quantity <= 0) continue;

    const rule = resolvePackingRule({ slug: item.slug, name: item.name });
    if (!rule) {
      unsupported.push({
        productId: item.productId,
        name: item.name,
        slug: item.slug,
      });
      continue;
    }

    let remaining = item.quantity;
    while (remaining > 0) {
      const unitsInBox = Math.min(remaining, rule.unitsPerBox);
      parcels.push({
        lengthIn: rule.box.lengthIn,
        widthIn: rule.box.widthIn,
        heightIn: rule.box.heightIn,
        weightLbs: roundWeightLbs(unitsInBox * rule.unitWeightLbs),
      });
      remaining -= unitsInBox;
    }
  }

  if (unsupported.length > 0) {
    throw new UnsupportedPackingProductsError(unsupported);
  }

  if (parcels.length === 0) {
    throw new Error('No shippable parcels could be calculated for this order.');
  }

  return parcels;
}
