export interface ProductPackingProfile {
  productId: string;
  productLengthIn: number;
  productWidthIn: number;
  productHeightIn: number;
  boxLengthIn: number;
  boxWidthIn: number;
  boxHeightIn: number;
  packagingWeightLbs: number;
  unitsPerBox: number;
  maxPackedWeightLbs: number;
  shipsSeparately: boolean;
  canMix: boolean;
  fragile: boolean;
  stackable: boolean;
}

export interface ProductPackingProfileRow {
  product_id: string;
  product_length_in: number | string;
  product_width_in: number | string;
  product_height_in: number | string;
  box_length_in: number | string;
  box_width_in: number | string;
  box_height_in: number | string;
  packaging_weight_lbs: number | string;
  units_per_box: number;
  max_packed_weight_lbs: number | string;
  ships_separately: boolean;
  can_mix: boolean;
  fragile: boolean;
  stackable: boolean;
}

function positiveNumber(value: number | string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function mapProductPackingProfile(row: ProductPackingProfileRow): ProductPackingProfile {
  return {
    productId: row.product_id,
    productLengthIn: positiveNumber(row.product_length_in, 1),
    productWidthIn: positiveNumber(row.product_width_in, 1),
    productHeightIn: positiveNumber(row.product_height_in, 1),
    boxLengthIn: positiveNumber(row.box_length_in, 1),
    boxWidthIn: positiveNumber(row.box_width_in, 1),
    boxHeightIn: positiveNumber(row.box_height_in, 1),
    packagingWeightLbs: Math.max(0, Number(row.packaging_weight_lbs) || 0),
    unitsPerBox: Math.max(1, Math.floor(Number(row.units_per_box) || 1)),
    maxPackedWeightLbs: Math.min(70, positiveNumber(row.max_packed_weight_lbs, 70)),
    shipsSeparately: Boolean(row.ships_separately),
    canMix: Boolean(row.can_mix),
    fragile: Boolean(row.fragile),
    stackable: Boolean(row.stackable),
  };
}
