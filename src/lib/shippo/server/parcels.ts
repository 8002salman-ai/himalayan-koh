import type { ShippoParcelInput } from '../types';

export function shippoParcelPayload(parcel: ShippoParcelInput) {
  return {
    length: String(parcel.lengthIn),
    width: String(parcel.widthIn),
    height: String(parcel.heightIn),
    distance_unit: 'in',
    weight: String(parcel.weightLbs),
    mass_unit: 'lb',
  };
}
