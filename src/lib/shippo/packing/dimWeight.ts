/** USPS Priority Mail domestic dimensional weight divisor. */
export const USPS_DIM_DIVISOR = 166;

/**
 * Dimensional weight in lbs = (L × W × H) / divisor.
 * Carriers use this to bill bulky-but-light packages at a higher weight.
 */
export function calcDimWeightLbs(
  lengthIn: number,
  widthIn: number,
  heightIn: number,
  divisor = USPS_DIM_DIVISOR,
): number {
  return (lengthIn * widthIn * heightIn) / divisor;
}

/**
 * Billable weight = max(actual weight, dimensional weight).
 * USPS Priority Mail and most carriers bill whichever is greater.
 */
export function calcBillableWeightLbs(
  actualWeightLbs: number,
  lengthIn: number,
  widthIn: number,
  heightIn: number,
  divisor = USPS_DIM_DIVISOR,
): number {
  const dim = calcDimWeightLbs(lengthIn, widthIn, heightIn, divisor);
  return Math.max(actualWeightLbs, dim);
}
