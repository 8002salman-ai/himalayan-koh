import { useState } from 'react';
import { Megaphone } from 'lucide-react';
import {
  AdminPageHeader,
  AdminPanel,
  AdminPendingPanel,
  AdminStatTile,
  AdminTabs,
} from '../../components/admin/AdminUI';

/**
 * Marketing.
 *
 * Every capability here acts on a system this console is not yet connected to
 * (WooCommerce for promotions and coupons, the email provider for campaigns, and
 * analytics for segment maths). Each tab therefore states the connection it
 * needs instead of showing an empty table that looks like a working screen. No
 * email is ever sent from a development build.
 */
type MarketingTabId = 'campaigns' | 'promotions' | 'coupons' | 'segments' | 'email' | 'analytics';

const TABS: Array<{ id: MarketingTabId; label: string; badge?: string }> = [
  { id: 'campaigns', label: 'Campaigns', badge: 'Pending' },
  { id: 'promotions', label: 'Promotions', badge: 'Pending' },
  { id: 'coupons', label: 'Coupons', badge: 'Pending' },
  { id: 'segments', label: 'Segments', badge: 'Pending' },
  { id: 'email', label: 'Email preparation', badge: 'Pending' },
  { id: 'analytics', label: 'Marketing analytics', badge: 'Pending' },
];

const CONTENT: Record<MarketingTabId, { title: string; summary: string; needs: string[]; available?: string[] }> = {
  campaigns: {
    title: 'Campaigns are not connected',
    summary: 'Campaign records need a store this project owns; none exists yet.',
    needs: [
      'A decision on where campaign records live (WooCommerce marketing tables or a dedicated table) — no second commerce catalogue.',
      'A scheduler that can start and stop a campaign without a deploy.',
    ],
  },
  promotions: {
    title: 'Product promotions are not connected',
    summary: 'Promotions are WooCommerce sale prices and coupon rules, written through its authenticated API.',
    needs: [
      'A WooCommerce REST key with write access to create sale prices and coupon rules.',
      'A guard that shows the resulting storefront price before the write is committed.',
    ],
  },
  coupons: {
    title: 'Coupons are managed on the Coupons screen',
    summary: 'Coupon CRUD has its own section, which is the single owner of discount codes.',
    needs: [
      'The same WooCommerce credential described on the Coupons screen.',
      'Once connected, this tab will surface the campaign a coupon belongs to rather than duplicating the list.',
    ],
    available: ['A Coupons section already exists and reads and writes to WooCommerce only.'],
  },
  segments: {
    title: 'Customer segments are not connected',
    summary: 'Segment maths needs order history; this deployment has no order source configured.',
    needs: [
      'An order source (Supabase is available today, WooCommerce orders after the orders migration).',
      'A definition of each segment (spend, recency, products bought) stored as data, not code.',
    ],
  },
  email: {
    title: 'Email preparation is not connected',
    summary: 'No email provider is configured, and development builds never send bulk mail.',
    needs: [
      'An email provider credential stored server-side.',
      'A test-mode recipient allowlist so a preview deployment cannot mail real customers.',
    ],
    available: ['The preview storefront is marked noindex, so a link leaked from a test send cannot be indexed.'],
  },
  analytics: {
    title: 'Marketing analytics are not connected',
    summary: 'Attribution needs campaign, traffic and order data together; none of the three is wired to this console.',
    needs: [
      'Campaign records (see Campaigns).',
      'Order history from the same source that will own orders after the migration.',
    ],
  },
};

export default function AdminMarketing() {
  const [tab, setTab] = useState<MarketingTabId>('campaigns');
  const content = CONTENT[tab];

  return (
    <>
      <AdminPageHeader
        eyebrow="Growth"
        title="Marketing"
        description="Campaigns, promotions and customer segments. Every capability here is read from and written to a connected system — never invented."
      />

      <div className="grid grid-cols-4 gap-4">
        <AdminStatTile label="Active campaigns" icon={Megaphone} tone="brand" unavailable="Not connected" />
        <AdminStatTile label="Live promotions" icon={Megaphone} tone="green" unavailable="Not connected" />
        <AdminStatTile label="Coupons issued" icon={Megaphone} tone="amber" unavailable="Not connected" />
        <AdminStatTile label="Emails sent" icon={Megaphone} tone="slate" unavailable="Disabled in preview" />
      </div>

      <AdminPanel bodyClassName="px-5 pt-2 pb-0">
        <AdminTabs tabs={TABS} active={tab} onChange={setTab} />
      </AdminPanel>

      <AdminPendingPanel
        title={content.title}
        summary={content.summary}
        needs={content.needs}
        available={content.available}
      />
    </>
  );
}
