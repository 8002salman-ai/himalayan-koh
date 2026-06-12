import type { ShippoParcelInput } from '../types';
import { UnsupportedPackingProductsError } from './errors';
import { resolvePackingRule } from './rules';
import { calcBillableWeightLbs, calcDimWeightLbs } from './dimWeight';

export interface PackingLineItem {
  productId?: string;
  quantity: number;
  slug: string;
  name: string;
  weightLbs?: number | null;
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

    const rule = resolvePackingRule({
      slug: item.slug,
      name: item.name,
      weightLbs: item.weightLbs,
    });
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
      const { lengthIn, widthIn, heightIn } = rule.box;
      const actualWeightLbs = roundWeightLbs(unitsInBox * rule.unitWeightLbs);
      const dimWeightLbs = roundWeightLbs(calcDimWeightLbs(lengthIn, widthIn, heightIn));
      const billableWeightLbs = roundWeightLbs(
        calcBillableWeightLbs(actualWeightLbs, lengthIn, widthIn, heightIn),
      );
      parcels.push({
        lengthIn,
        widthIn,
        heightIn,
        weightLbs: billableWeightLbs,
        actualWeightLbs,
        dimWeightLbs,
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

/** Combine multiple packing boxes into one parcel for reliable label purchase. */
export function buildConsolidatedParcelFromPackingLineItems(
  items: PackingLineItem[],
): ShippoParcelInput[] {
  const parcels = buildParcelsFromPackingLineItems(items);
  if (parcels.length <= 1) return parcels;

  // Sum actual product weights (not billable) for true consolidated weight
  const totalActualWeightLbs = roundWeightLbs(
    parcels.reduce((sum, parcel) => sum + (parcel.actualWeightLbs ?? parcel.weightLbs), 0),
  );
  const lengthIn = Math.max(...parcels.map((parcel) => parcel.lengthIn ?? 10));
  const widthIn = Math.max(...parcels.map((parcel) => parcel.widthIn ?? 10));
  const stackedHeight = parcels.reduce((sum, parcel) => sum + (parcel.heightIn ?? 6), 0);
  const heightIn = Math.min(12, Math.max(6, roundWeightLbs(stackedHeight)));

  // Re-apply DIM weight to the final consolidated box dimensions
  const dimWeightLbs = roundWeightLbs(calcDimWeightLbs(lengthIn, widthIn, heightIn));
  const billableWeightLbs = roundWeightLbs(
    calcBillableWeightLbs(totalActualWeightLbs, lengthIn, widthIn, heightIn),
  );

  return [
    {
      lengthIn,
      widthIn,
      heightIn,
      weightLbs: billableWeightLbs,
      actualWeightLbs: totalActualWeightLbs,
      dimWeightLbs,
    },
  ];
}
