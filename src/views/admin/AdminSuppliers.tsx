'use client';

import { useState } from 'react';
import { Factory, Package, Truck } from 'lucide-react';
import {
  ADMIN_TD,
  AdminCapabilityPanel,
  AdminChip,
  AdminNotice,
  AdminPageHeader,
  AdminPanel,
  AdminPendingChip,
  AdminStatTile,
  AdminTable,
  AdminTabs,
} from '../../components/admin/AdminUI';

type Tab = 'suppliers' | 'costs' | 'receiving';

const TABS: { id: Tab; label: string }[] = [
  { id: 'suppliers', label: 'Suppliers' },
  { id: 'costs', label: 'Landed cost' },
  { id: 'receiving', label: 'Receiving' },
];

/** Where the stock physically comes from, as this store actually operates. */
const SOURCING_MODEL = [
  {
    role: 'Mine and mill',
    detail: 'The salt is sourced and packed for Himalayan Koh, then held in the store’s own warehouse.',
    owner: 'Supplier record needed',
  },
  {
    role: 'Freight',
    detail: 'Inbound freight is costed per shipment; the landed cost per unit is what a shelf price has to cover.',
    owner: 'No record kept yet',
  },
  {
    role: 'Outbound',
    detail: 'Orders ship from the store’s warehouse through Shippo, which already exists in Settings.',
    owner: 'Connected route',
  },
];

/**
 * Suppliers.
 *
 * Luxedge's equivalent module is a dropship supplier integration; Himalayan Koh
 * packs and ships its own stock, so the workflow that transfers is not
 * order-routing but landed cost and receiving. That is stated plainly instead of
 * presenting an integration the business does not use — a dropship feed would be
 * a feature nobody would switch on.
 */
export default function AdminSuppliers() {
  const [tab, setTab] = useState<Tab>('suppliers');

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="System"
        title="Suppliers"
        description="Who supplies the stock, what it lands at per unit, and what has been received."
        actions={<AdminPendingChip label="No supplier records yet" />}
      />

      <div className="grid grid-cols-3 gap-4">
        <AdminStatTile label="Suppliers" icon={Factory} tone="slate" unavailable="No records kept" />
        <AdminStatTile label="Open purchase orders" icon={Package} tone="slate" unavailable="Not connected" />
        <AdminStatTile label="Units received (30 days)" icon={Truck} tone="slate" unavailable="Not connected" />
      </div>

      <AdminTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'suppliers' && (
        <>
          <AdminPanel title="How this store sources" description="Different from a dropship operation, and the screen says so">
            <AdminTable
              columns={[
                { key: 'role', label: 'Stage' },
                { key: 'detail', label: 'How it works here' },
                { key: 'state', label: 'State', align: 'right' },
              ]}
              minWidth="880px"
            >
              {SOURCING_MODEL.map((row) => (
                <tr key={row.role}>
                  <td className={`${ADMIN_TD} font-medium text-admin-ink`}>{row.role}</td>
                  <td className={`${ADMIN_TD} text-admin-muted`}>{row.detail}</td>
                  <td className={`${ADMIN_TD} text-right`}>
                    {row.owner === 'Connected route' ? (
                      <AdminChip tone="success">{row.owner}</AdminChip>
                    ) : (
                      <AdminChip tone="warning">{row.owner}</AdminChip>
                    )}
                  </td>
                </tr>
              ))}
            </AdminTable>
          </AdminPanel>

          <AdminNotice tone="info" title="No dropship feed">
            A third-party supplier integration routes orders to someone else&apos;s warehouse. This
            store ships its own stock, so there is nothing for such a feed to do — the module it
            becomes is cost and receiving, not order routing.
          </AdminNotice>

          <AdminCapabilityPanel
            title="Supplier records"
            summary="Each supplier, what it supplies, its lead time, and the unit cost agreed with it."
            capabilities={['supplier-feed']}
            available={[
              'The outbound leg already exists: Shippo handles labels and rates from the store’s warehouse.',
              'No cost is shown until it has been recorded — a margin computed from a guessed cost is worse than no margin.',
            ]}
          />
        </>
      )}

      {tab === 'costs' && (
        <AdminCapabilityPanel
          title="Landed cost per product"
          summary="Unit cost plus inbound freight, against the price the product sells at."
          capabilities={['supplier-feed', 'woo-rest-read']}
          available={[
            'Selling prices come from the catalog adapter; only the cost side is missing.',
            'Margin is only printed once both sides exist, so the column cannot read as a full-cost margin when half of it is absent.',
          ]}
        />
      )}

      {tab === 'receiving' && (
        <AdminCapabilityPanel
          title="Receiving"
          summary="Stock arriving against a purchase order, and the stock adjustment that follows."
          capabilities={['supplier-feed', 'woo-write']}
          available={[
            'Stock lives in WooCommerce, so receiving adjusts WooCommerce quantities rather than a second inventory count.',
          ]}
        />
      )}
    </div>
  );
}
