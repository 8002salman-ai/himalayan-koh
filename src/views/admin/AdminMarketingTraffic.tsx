'use client';

import { useMemo, useState } from 'react';
import { ArrowUpRight, ExternalLink, Link2, TrendingUp, Users } from 'lucide-react';
import {
  AdminCapabilityPanel,
  AdminChip,
  AdminField,
  AdminInput,
  AdminNotice,
  AdminPageHeader,
  AdminPanel,
  AdminPendingChip,
  AdminStatTile,
  AdminTabs,
} from '../../components/admin/AdminUI';

type Tab = 'channels' | 'utms' | 'pages';

const TABS: { id: Tab; label: string }[] = [
  { id: 'channels', label: 'Channels' },
  { id: 'utms', label: 'Campaign links' },
  { id: 'pages', label: 'Landing pages' },
];

/** The storefront origin a tagged link should point at — never the preview host. */
const STORE_ORIGIN = 'https://himalayankoh.com';

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Marketing & Traffic.
 *
 * Traffic figures need an analytics property, so the metric tiles state that
 * rather than reporting a made-up session count. The one genuinely working tool
 * on this screen is the campaign-link builder: a UTM link is deterministic, it
 * is what makes the analytics readable once it is connected, and getting the
 * naming convention wrong is the usual reason traffic data becomes useless later
 * — so it is worth having before the property exists.
 */
export default function AdminMarketingTraffic() {
  const [tab, setTab] = useState<Tab>('channels');
  const [path, setPath] = useState('/products');
  const [source, setSource] = useState('newsletter');
  const [medium, setMedium] = useState('email');
  const [campaign, setCampaign] = useState('winter-restock');

  const taggedUrl = useMemo(() => {
    const cleanPath = path.trim() || '/';
    const normalised = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
    const params = new URLSearchParams();
    if (source.trim()) params.set('utm_source', slugify(source));
    if (medium.trim()) params.set('utm_medium', slugify(medium));
    if (campaign.trim()) params.set('utm_campaign', slugify(campaign));
    const query = params.toString();
    return `${STORE_ORIGIN}${normalised}${query ? `?${query}` : ''}`;
  }, [path, source, medium, campaign]);

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Marketing"
        title="Marketing & Traffic"
        description="Where storefront visits come from and what they do — channel, campaign and landing-page performance."
        actions={<AdminPendingChip label="Analytics not connected" />}
      />

      <div className="grid grid-cols-3 gap-4">
        <AdminStatTile label="Sessions" icon={Users} tone="slate" unavailable="Not connected" />
        <AdminStatTile label="Conversion rate" icon={TrendingUp} tone="slate" unavailable="Not connected" />
        <AdminStatTile label="Top channel" icon={ArrowUpRight} tone="slate" unavailable="Not connected" />
      </div>

      <AdminTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'channels' && (
        <AdminCapabilityPanel
          title="Channels"
          summary="Sessions and revenue by source — direct, search, email, social and paid."
          capabilities={['traffic-analytics']}
          available={[
            'The storefront is served from one origin, so channel attribution will be unambiguous once a property exists.',
            'The preview host is excluded from analytics by policy; only himalayankoh.com is measured.',
          ]}
        />
      )}

      {tab === 'utms' && (
        <>
          <AdminPanel
            title="Campaign link builder"
            description="Tags a storefront URL so a campaign is attributable the moment analytics is connected. Works now — nothing here depends on the missing property."
          >
            <div className="grid grid-cols-4 gap-4">
              <AdminField label="Landing path" hint="Must exist on the storefront">
                <AdminInput value={path} onChange={(event) => setPath(event.target.value)} />
              </AdminField>
              <AdminField label="Source" hint="utm_source">
                <AdminInput value={source} onChange={(event) => setSource(event.target.value)} />
              </AdminField>
              <AdminField label="Medium" hint="utm_medium">
                <AdminInput value={medium} onChange={(event) => setMedium(event.target.value)} />
              </AdminField>
              <AdminField label="Campaign" hint="utm_campaign">
                <AdminInput value={campaign} onChange={(event) => setCampaign(event.target.value)} />
              </AdminField>
            </div>

            <div className="mt-5 rounded-xl border border-admin-line bg-admin-canvas px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-admin-muted">
                Tagged URL
              </p>
              <p className="mt-1 break-all font-mono text-[13px] text-admin-ink">{taggedUrl}</p>
            </div>

            <p className="mt-3 text-xs text-admin-muted">
              Values are lower-cased and hyphenated, so <code>Winter Restock</code> and{' '}
              <code>winter-restock</code> cannot become two campaigns.
            </p>

            <a
              href={taggedUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-himalayan-dark hover:underline"
            >
              <ExternalLink size={15} />
              Open the tagged production URL
            </a>
          </AdminPanel>

          <AdminPanel title="Convention" description="The naming rule that keeps reports comparable">
            <ul className="space-y-2 text-sm text-admin-ink">
              <li>
                <strong>source</strong> — one of newsletter, google, meta, instagram, partner.
              </li>
              <li>
                <strong>medium</strong> — one of email, cpc, social, organic, referral.
              </li>
              <li>
                <strong>campaign</strong> — a dated name (winter-restock-2026), never a message
                variant; the variant belongs in the ad, not in the tag.
              </li>
            </ul>
            <div className="mt-4 flex items-start gap-2 text-xs text-admin-muted">
              <Link2 size={14} className="mt-0.5" />
              <p>
                Links are built against the production origin. Preview links are never shared
                externally, and the preview host carries noindex so an indexed preview can never
                split attribution.
              </p>
            </div>
          </AdminPanel>
        </>
      )}

      {tab === 'pages' && (
        <AdminCapabilityPanel
          title="Landing pages"
          summary="Which storefront paths convert, so a campaign can be pointed at a page that works."
          capabilities={['traffic-analytics']}
          available={['The storefront routes are known, so each row will map to a real path.']}
        />
      )}

      <AdminNotice tone="info" title="Numbers on this screen">
        Session and conversion figures stay blank until a property is connected. They are never
        estimated from order counts or from anything else, because a plausible-looking traffic number
        is acted on the same way as a real one.
      </AdminNotice>

      <div className="flex flex-wrap gap-2">
        <AdminChip tone="muted">Google Analytics</AdminChip>
        <AdminChip tone="muted">Google Ads</AdminChip>
        <AdminChip tone="muted">Meta</AdminChip>
        <AdminChip tone="muted">Search Console</AdminChip>
      </div>
    </div>
  );
}
