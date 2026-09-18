import { Ticket } from 'lucide-react';
import {
  AdminPageHeader,
  AdminPendingPanel,
  AdminStatTile,
} from '../../components/admin/AdminUI';

/**
 * Coupons.
 *
 * WooCommerce owns coupons. There is deliberately no local coupon table to fill
 * this page with: writing promotions anywhere else would create a second source
 * of truth for pricing, which is the exact failure this migration removed from
 * the catalog.
 */
export default function AdminCoupons() {
  return (
    <>
      <AdminPageHeader
        eyebrow="Commerce"
        title="Coupons"
        description="Discount codes and promotions, read from and written to WooCommerce."
      />

      <div className="grid grid-cols-4 gap-4">
        <AdminStatTile label="Coupons" icon={Ticket} tone="brand" unavailable="Not connected" />
        <AdminStatTile label="Active now" icon={Ticket} tone="green" unavailable="Not connected" />
        <AdminStatTile label="Scheduled" icon={Ticket} tone="amber" unavailable="Not connected" />
        <AdminStatTile label="Redemptions" icon={Ticket} tone="slate" unavailable="Not connected" />
      </div>

      <AdminPendingPanel
        title="Coupon management is not connected"
        summary="The console has no WooCommerce credential yet, so there is nothing it can honestly list or change here."
        needs={[
          'A WooCommerce REST API key with read access for the coupon list (server-side only).',
          'Write access for the same key to create, edit, disable and delete coupons.',
          'A decision on who may issue discounts, so the action is gated by role rather than by screen.',
        ]}
        available={[
          'The storefront already reads its catalog from WooCommerce, so a coupon created there is the only one that will ever apply at checkout.',
        ]}
      />
    </>
  );
}
