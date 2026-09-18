'use client';

import { Ticket, Percent, CalendarClock } from 'lucide-react';
import {
  AdminChip,
  AdminPageHeader,
  AdminPanel,
  AdminPendingPanel,
  AdminStatTile,
  AdminTabs,
} from '../../components/admin/AdminUI';
import { useMemo, useState } from 'react';

type Tab = 'promotions' | 'coupons' | 'scheduled';

const TABS: { id: Tab; label: string; badge?: string }[] = [
  { id: 'promotions', label: 'Promotions' },
  { id: 'coupons', label: 'Coupons' },
  { id: 'scheduled', label: 'Scheduled' },
];

/**
 * Promotions — the Luxedge console's umbrella for price rules, coupons and
 * scheduled discounts, adapted to WooCommerce.
 *
 * WooCommerce owns discounts, so every figure here would have to come from
 * `wc/v3/coupons`, which needs the store's REST key. Until that credential
 * exists the screen states the split rather than showing an empty table that
 * looks like "no promotions" — the distinction matters before a sale.
 */
export default function AdminPromotions() {
  const [tab, setTab] = useState<Tab>('promotions');

  const summary = useMemo(
    () => [
      { label: 'Active promotions', icon: Percent, tone: 'slate' as const, unavailable: 'Not connected' },
      { label: 'Coupons in WooCommerce', icon: Ticket, tone: 'slate' as const, unavailable: 'Not connected' },
      { label: 'Scheduled', icon: CalendarClock, tone: 'slate' as const, unavailable: 'Not connected' },
    ],
    []
  );

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Catalog"
        title="Promotions"
        description="Discounts, coupons and scheduled price rules. WooCommerce is the authority for what a customer is actually charged; nothing here changes a price until that connection exists."
        actions={<AdminChip tone="warning">Backend integration pending</AdminChip>}
      />

      <div className="grid grid-cols-3 gap-4">
        {summary.map((tile) => (
          <AdminStatTile
            key={tile.label}
            label={tile.label}
            icon={tile.icon}
            tone={tile.tone}
            unavailable={tile.unavailable}
          />
        ))}
      </div>

      <AdminTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'promotions' && (
        <AdminPendingPanel
          title="Price rules"
          summary="Percentage and fixed-amount promotions applied to chosen products, categories or the whole catalog."
          needs={[
            'A WooCommerce REST key with read/write scope, server-side only',
            'A decision on whether a promotion is a coupon or a scheduled sale price (Woo treats them differently)',
          ]}
          available={[
            'The catalog this would act on, read through the same adapter the storefront uses',
            'The coupon module already exists at /admin/coupons as the WooCommerce owner of discounts',
          ]}
        />
      )}

      {tab === 'coupons' && (
        <AdminPanel
          title="Coupons"
          description="Discount codes — owned by WooCommerce, managed on the Coupons screen"
        >
          <p className="text-sm text-admin-ink">
            Coupons live on their own screen so there is one place to create a code and one place to
            see what it did. Promotions that are not codes (sale prices, category discounts) belong
            here once the REST key exists.
          </p>
        </AdminPanel>
      )}

      {tab === 'scheduled' && (
        <AdminPendingPanel
          title="Scheduled promotions"
          summary="A promotion with a start and end timestamp, applied automatically by WooCommerce."
          needs={[
            'The WooCommerce REST key (a schedule is written as a sale price with dates)',
            'A store timezone decision recorded in Settings, so a schedule does not fire an hour early',
          ]}
        />
      )}
    </div>
  );
}
