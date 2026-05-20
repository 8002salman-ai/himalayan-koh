import type { Product } from '../../../data/products';

export const LIVESTOCK_PDP_CATEGORIES = new Set([
  'Salt Lick for Horses',
  'Salt for Cattle',
  'Salt Blocks for Deer',
  'Salt Lumps for Cattle',
]);

export function isLivestockPdpProduct(product: Product): boolean {
  return LIVESTOCK_PDP_CATEGORIES.has(product.category);
}
