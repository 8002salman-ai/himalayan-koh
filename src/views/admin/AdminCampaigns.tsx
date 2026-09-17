'use client';

import { useState } from 'react';
import { CalendarClock, Megaphone, Percent, RefreshCw, Send, Ticket } from 'lucide-react';
import {
  ADMIN_TD,
  AdminCapabilityPanel,
  AdminChip,
  AdminField,
  AdminInput,
  AdminNotice,
  AdminPageHeader,
  AdminPanel,
  AdminPendingChip,
  AdminStatTile,
  AdminTable,
  AdminTableSkeleton,
  AdminTabs,
  AdminTextarea,
} from '../../components/admin/AdminUI';
import { useAdminCatalog } from '../../lib/admin/useAdminCatalog';
import { catalogSourceLabel } from '../../lib/admin/capabilities';

type Tab = 'campaigns' | 'audience' | 'calendar';

const TABS: { id: Tab; label: string }[] = [
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'audience', label: 'Audience' },
  { id: 'calendar', label: 'Calendar' },
];

/**
 * Campaigns — Luxedge's campaign manager over the Himalayan Koh catalog.
 *
 * A campaign is a claim about reach ("this sale will be seen by N people"), so
 * the parts that need a channel report *not connected* rather than a zero. What
 * is genuinely real here is the thing a campaign is pointed at: the catalog,
 * read through the same adapter the storefront uses, with each product's price
 * availability stated exactly as the source reported it.
 */
export default function AdminCampaigns() {
  const [tab, setTab] = useState<Tab>('campaigns');
  const [name, setName] = useState('');
  const [brief, setBrief] = useState('');
  const { rows, stats, warnings, loading, error, reload } = useAdminCatalog({ sort: 'name' });

  const promotable = rows.filter((row) => !row.missing.includes('price'));

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Catalog"
        title="Campaigns"
        description="Promotional pushes across email, on-site banners and paid channels, planned against the real catalog."
        actions={
          <>
            <AdminPendingChip />
            <button
              type="button"
              onClick={reload}
              className="inline-flex items-center gap-2 rounded-xl border border-admin-line bg-admin-surface px-4 py-2.5 text-sm font-semibold text-admin-ink transition-colors hover:bg-admin-canvas"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </>
        }
      />

      {error && (
        <AdminNotice tone="danger" title="Could not read the catalog">
          {error}
        </AdminNotice>
      )}

      <div className="grid grid-cols-3 gap-4">
        <AdminStatTile
          label="Running campaigns"
          icon={Megaphone}
          tone="slate"
          unavailable="Not connected"
        />
        <AdminStatTile
          label="Campaign-ready products"
          icon={Percent}
          tone={promotable.length > 0 ? 'brand' : 'amber'}
          value={loading ? '—' : promotable.length}
          hint={`needs a readable price · ${catalogSourceLabel()}`}
        />
        <AdminStatTile
          label="Scheduled sends"
          icon={CalendarClock}
          tone="slate"
          unavailable="Not connected"
        />
      </div>

      <AdminTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'campaigns' && (
        <>
          <AdminPanel
            title="Draft a campaign"
            description="Saved nowhere yet — a draft has to become a real WooCommerce discount or a real send before it can affect a customer"
          >
            <div className="grid grid-cols-2 gap-5">
              <AdminField label="Campaign name">
                <AdminInput
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Winter salt-lick restock"
                />
              </AdminField>
              <AdminField label="Goal" hint="What this campaign is for">
                <AdminInput value="" readOnly placeholder="Reach an existing segment" />
              </AdminField>
            </div>
            <AdminField label="Brief" className="mt-5">
              <AdminTextarea
                rows={3}
                value={brief}
                onChange={(event) => setBrief(event.target.value)}
                placeholder="Offer, audience, channel and the dates it should run"
              />
            </AdminField>
            <div className="mt-5 flex items-center justify-between gap-4 border-t border-admin-line pt-4">
              <p className="text-xs text-admin-muted">
                A campaign cannot be sent while email sending and discount writes are unconnected.
              </p>
              <button
                type="button"
                disabled
                title="Email sending and WooCommerce write are not connected"
                className="rounded-xl bg-himalayan px-4 py-2.5 text-sm font-semibold text-white opacity-50"
              >
                <span className="inline-flex items-center gap-2">
                  <Send size={16} />
                  Launch campaign
                </span>
              </button>
            </div>
          </AdminPanel>

          <AdminPanel
            title="Products a campaign can feature"
            description={`Read live from ${catalogSourceLabel()} — the same catalog the storefront serves`}
          >
            <AdminTable
              columns={[
                { key: 'name', label: 'Product' },
                { key: 'category', label: 'Category' },
                { key: 'price', label: 'Price', align: 'right' },
                { key: 'state', label: 'Campaign-ready', align: 'right' },
              ]}
            >
              {loading ? (
                <AdminTableSkeleton rows={6} columns={4} />
              ) : (
                rows.slice(0, 12).map((row) => (
                  <tr key={row.id}>
                    <td className={ADMIN_TD}>
                      <span className="font-medium text-admin-ink">{row.name}</span>
                    </td>
                    <td className={`${ADMIN_TD} text-admin-muted`}>
                      {row.categoryName ?? 'Uncategorised'}
                    </td>
                    <td className={`${ADMIN_TD} text-right`}>
                      {row.missing.includes('price') ? (
                        <AdminChip tone="muted">Price unavailable</AdminChip>
                      ) : (
                        <span className="font-semibold text-admin-ink">{row.price}</span>
                      )}
                    </td>
                    <td className={`${ADMIN_TD} text-right`}>
                      {row.missing.includes('price') ? (
                        <AdminChip tone="muted">No readable price</AdminChip>
                      ) : (
                        <AdminChip tone="success">Ready</AdminChip>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </AdminTable>
            {!loading && rows.length === 0 && (
              <p className="px-5 py-6 text-sm text-admin-muted">
                The catalog source reported no products, so there is nothing to feature.
              </p>
            )}
          </AdminPanel>

          {warnings.map((warning) => (
            <AdminNotice key={warning} tone="info" title="Adapter note">
              {warning}
            </AdminNotice>
          ))}

          <AdminCapabilityPanel
            title="Campaign delivery"
            summary="Discounts, landing pages and sends — the parts of a campaign that reach a customer."
            capabilities={['woo-write', 'email-send']}
            available={[
              loading
                ? 'Still reading the catalog — the product count is stated once it answers.'
                : `${stats?.total ?? rows.length} products are readable from ${catalogSourceLabel()}; that is the catalog a campaign would act on.`,
              'Drafting happens on this screen without a connection, so a campaign can be prepared before the keys exist.',
            ]}
          />
        </>
      )}

      {tab === 'audience' && (
        <AdminCapabilityPanel
          title="Audience"
          summary="Segments built from real customer and order history, so a campaign is aimed rather than broadcast."
          capabilities={['woo-rest-read', 'crm-sync']}
          available={[
            'The storefront collects newsletter addresses today through /api/newsletter; the list is not readable from the console yet.',
            'No segment is shown rather than a placeholder count.',
          ]}
        />
      )}

      {tab === 'calendar' && (
        <AdminCapabilityPanel
          title="Calendar"
          summary="When each campaign runs, and which discount is live on a given day."
          capabilities={['woo-write']}
          available={[
            'The store timezone setting the calendar would use lives in Settings → General.',
            'WooCommerce is the owner of scheduled sale dates; the calendar mirrors it rather than holding its own schedule.',
          ]}
        />
      )}

      <AdminPanel title="Where discounts are managed today" description="One owner per concept">
        <div className="flex items-start gap-3 text-sm text-admin-ink">
          <Ticket size={16} className="mt-0.5 text-admin-muted" />
          <p>
            Coupon codes live on the Coupons screen, and price rules on Promotions. This screen
            plans the push around them; it does not become a second place to create a discount.
          </p>
        </div>
      </AdminPanel>
    </div>
  );
}
