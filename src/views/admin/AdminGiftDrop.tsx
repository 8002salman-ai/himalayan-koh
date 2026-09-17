'use client';

import { useState } from 'react';
import { Gift, Users, PackageCheck } from 'lucide-react';
import {
  AdminChip,
  AdminField,
  AdminInput,
  AdminNotice,
  AdminPageHeader,
  AdminPanel,
  AdminPendingPanel,
  AdminStatTile,
  AdminTabs,
  AdminButton,
} from '../../components/admin/AdminUI';
import { MICRO_LABEL } from '../../components/admin/adminTheme';

type Tab = 'drop' | 'claims' | 'rules';

const TABS: { id: Tab; label: string }[] = [
  { id: 'drop', label: 'This drop' },
  { id: 'claims', label: 'Claims' },
  { id: 'rules', label: 'Rules' },
];

/**
 * Gift Drop — a free-gift claim event, the Himalayan Koh reading of the Luxedge
 * module of the same name.
 *
 * The workflow is a claim: a customer takes one free item from a limited stock,
 * one per customer, until the drop is exhausted. That needs a claim store and an
 * inventory count that decrements atomically — neither exists here yet, and
 * inventing a "49/50 remaining" style figure would be exactly the fake metric
 * the console is built to avoid. So the screen is a real configuration form
 * (the part that is genuinely decided here) plus an explicit pending panel for
 * the claim backend.
 */
export default function AdminGiftDrop() {
  const [tab, setTab] = useState<Tab>('drop');
  const [label, setLabel] = useState('');
  const [perCustomer, setPerCustomer] = useState('1');

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Catalog"
        title="Gift Drop"
        description="A limited free-gift claim event: one item, one claim per customer, until the drop runs out. Configuring a drop is safe; enabling one is not possible until the claim store exists."
        actions={<AdminChip tone="warning">Backend integration pending</AdminChip>}
      />

      <div className="grid grid-cols-3 gap-4">
        <AdminStatTile label="Claims today" icon={Users} tone="slate" unavailable="Not connected" />
        <AdminStatTile label="Gifts remaining" icon={Gift} tone="slate" unavailable="No drop is running" />
        <AdminStatTile label="Fulfilled" icon={PackageCheck} tone="slate" unavailable="Not connected" />
      </div>

      <AdminTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'drop' && (
        <>
          <AdminPanel
            title="Draft a drop"
            description="Saved as a draft only — a draft has no customer-facing effect"
          >
            <div className="grid grid-cols-3 gap-5">
              <AdminField label="Drop name" hint="Shown on the claim page">
                <AdminInput
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="e.g. Free 1 lb pouch — launch week"
                />
              </AdminField>
              <AdminField label="Gift product" hint="Chosen from the WooCommerce catalog">
                <AdminInput value="" readOnly placeholder="Select from the catalog" />
              </AdminField>
              <AdminField label="Claims per customer">
                <AdminInput
                  type="number"
                  min={1}
                  value={perCustomer}
                  onChange={(event) => setPerCustomer(event.target.value)}
                />
              </AdminField>
            </div>
            <div className="mt-5 flex items-center justify-between gap-4 border-t border-admin-line pt-4">
              <p className={MICRO_LABEL}>Draft only — nothing is published from this screen</p>
              <AdminButton disabled title="The claim store does not exist yet">
                Save draft
              </AdminButton>
            </div>
          </AdminPanel>

          <AdminNotice tone="info" title="Why this cannot be enabled yet">
            A drop has to decrement one shared gift count atomically as customers claim, and record
            who claimed what so the limit holds. Neither exists in this deployment, so a live drop
            would either oversell the gift or count claims it cannot verify.
          </AdminNotice>
        </>
      )}

      {tab === 'claims' && (
        <AdminPendingPanel
          title="Claims"
          summary="Who claimed a gift, when, and whether it shipped — one row per claim."
          needs={[
            'A claim table (or a WooCommerce order line item per claim) with a uniqueness rule per customer',
            'An email or account check, so a claim can be tied to a person rather than a browser',
          ]}
          available={['The gift product itself, read from the WooCommerce staging catalog']}
        />
      )}

      {tab === 'rules' && (
        <AdminPanel title="Rules a drop runs under" description="Fixed policy for this store">
          <ul className="space-y-2 text-sm text-admin-ink">
            <li>One claim per customer account; guest claims are not counted.</li>
            <li>The gift is a catalog product, so its stock is WooCommerce&apos;s stock when that connection exists.</li>
            <li>A drop stops the moment its gift count reaches zero — it does not over-claim and backorder.</li>
            <li>Saving a draft never publishes; publishing is a separate, deliberate action.</li>
          </ul>
        </AdminPanel>
      )}
    </div>
  );
}
