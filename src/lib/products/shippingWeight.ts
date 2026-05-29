export function productMissingShippingWeight(weight: number | null | undefined): boolean {
  return weight == null || Number(weight) <= 0;
}

export function toWeightLbs(weight: number | null | undefined, unit: string | null | undefined): number | null {
  if (weight == null || Number(weight) <= 0) return null;
  const normalizedUnit = (unit || 'lbs').toLowerCase();
  if (normalizedUnit === 'kg' || normalizedUnit === 'kilogram' || normalizedUnit === 'kilograms') {
    return Math.round(Number(weight) * 2.20462 * 100) / 100;
  }
  if (normalizedUnit === 'oz' || normalizedUnit === 'ounce' || normalizedUnit === 'ounces') {
    return Math.round((Number(weight) / 16) * 100) / 100;
  }
  if (normalizedUnit === 'g' || normalizedUnit === 'gram' || normalizedUnit === 'grams') {
    return Math.round((Number(weight) / 453.592) * 100) / 100;
  }
  return Number(weight);
}

export function formatShippingWeightLabel(
  weight: number | null | undefined,
  unit: string | null | undefined,
): string | null {
  if (productMissingShippingWeight(weight)) return null;
  return `${Number(weight)} ${unit || 'lbs'}`;
}
