import type { ShippoParcelInput } from '../types';

export const DEFAULT_ITEM_WEIGHT_LBS = 2;
export const DEFAULT_PARCEL = {
  lengthIn: 8,
  widthIn: 6,
  heightIn: 4,
};

export function buildParcelsFromLineItems(
  items: { quantity: number; weightLbs?: number }[]
): ShippoParcelInput[] {
  const totalWeight = items.reduce((sum, item) => {
    const unitWeight = item.weightLbs && item.weightLbs > 0 ? item.weightLbs : DEFAULT_ITEM_WEIGHT_LBS;
    return sum + unitWeight * item.quantity;
  }, 0);

  const weightLbs = Math.max(0.1, Math.round(totalWeight * 100) / 100);

  return [
    {
      weightLbs,
      lengthIn: DEFAULT_PARCEL.lengthIn,
      widthIn: DEFAULT_PARCEL.widthIn,
      heightIn: DEFAULT_PARCEL.heightIn,
    },
  ];
}

export function shippoParcelPayload(parcel: ShippoParcelInput) {
  return {
    length: String(parcel.lengthIn ?? DEFAULT_PARCEL.lengthIn),
    width: String(parcel.widthIn ?? DEFAULT_PARCEL.widthIn),
    height: String(parcel.heightIn ?? DEFAULT_PARCEL.heightIn),
    distance_unit: 'in',
    weight: String(parcel.weightLbs),
    mass_unit: 'lb',
  };
}
