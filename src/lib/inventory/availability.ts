export interface InventoryLike {
  quantity: number;
  reserved_quantity: number;
  low_stock_threshold: number;
  track_inventory: boolean;
  allow_backorder: boolean;
}

export type AvailabilityLabel = 'In Stock' | 'Low Stock' | 'Backorder Available' | 'Waiting for Production';

export interface AvailabilityInfo {
  label: AvailabilityLabel;
  availableQty: number;
  badgeClass: string;
}

/** Client-safe — used to show real-time-ish availability on the catalog
 * before an order is ever placed. This is advisory
 * only; the authoritative check happens server-side on submission (see
 * checkPurchaseRequestStock.ts) and again at conversion time. */
export function getAvailability(inventory: InventoryLike | null | undefined): AvailabilityInfo {
  if (!inventory || inventory.track_inventory === false) {
    return { label: 'In Stock', availableQty: Infinity, badgeClass: 'bg-green-100 text-green-700' };
  }

  const availableQty = inventory.quantity - inventory.reserved_quantity;

  if (availableQty <= 0) {
    return inventory.allow_backorder
      ? { label: 'Backorder Available', availableQty, badgeClass: 'bg-blue-100 text-blue-700' }
      : { label: 'Waiting for Production', availableQty, badgeClass: 'bg-orange-100 text-orange-700' };
  }

  if (availableQty <= inventory.low_stock_threshold) {
    return { label: 'Low Stock', availableQty, badgeClass: 'bg-amber-100 text-amber-700' };
  }

  return { label: 'In Stock', availableQty, badgeClass: 'bg-green-100 text-green-700' };
}
