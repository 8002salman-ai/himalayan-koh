import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, Search, ShieldCheck, XCircle } from 'lucide-react';
import { fetchAdminCatalogStats } from '../../lib/admin/adminCatalogClient';
import type { AdminCatalogStats } from '../../lib/backend/adminCatalog';
import { getErrorMessage } from '../../lib/errors';
import {
  ADMIN_TD,
  AdminChip,
  AdminNotice,
  AdminPageHeader,
  AdminPanel,
  AdminPendingPanel,
  AdminStatTile,
  AdminTabs,
} from '../../components/admin/AdminUI';
import SeoAssistantPanel from '../../components/admin/SeoAssistantPanel';

/**
 * The SEO centre.
 *
 * The crawler checks on the Overview and Technical tabs are performed against
 * this running deployment as you open the page: the real `/robots.txt`, the real
 * `/sitemap.xml` and the real `X-Robots-Tag` response header. Those are facts the
 * console can verify on its own, so it does.
 *
 * Everything that would need the product's SEO fields in WordPress — writing
 * meta titles and descriptions, redirects, link audits — is listed as pending
 * with the connection it needs, because inventing a score there would be worse
 * than an empty panel.
 */
type SeoTabId = 'overview' | 'product' | 'content' | 'technical' | 'ai';

const TABS: Array<{ id: SeoTabId; label: string; badge?: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'product', label: 'Product & category SEO', badge: 'Pending' },
  { id: 'content', label: 'Content audits', badge: 'Pending' },
  { id: 'technical', label: 'Technical' },
  { id: 'ai', label: 'Gemini AI' },
];

interface CrawlerCheck {
  id: string;
  label: string;
  detail: string;
  ok: boolean | null;
}

export default function AdminSeo() {
  const [tab, setTab] = useState<SeoTabId>('overview');
  const [checks, setChecks] = useState<CrawlerCheck[]>([]);
  const [stats, setStats] = useState<AdminCatalogStats | null>(null);
  const [running, setRunning] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const runChecks = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      const [robots, sitemap, catalogStats] = await Promise.all([
        fetch('/robots.txt', { headers: { accept: 'text/plain' } }),
        fetch('/sitemap.xml', { headers: { accept: 'application/xml, text/xml' } }),
        fetchAdminCatalogStats().catch(() => null),
      ]);

      const robotsBody = robots.ok ? await robots.text() : '';
      const sitemapBody = sitemap.ok ? await sitemap.text() : '';
      const sitemapUrls = (sitemapBody.match(/<loc>/g) || []).length;

      setStats(catalogStats);
      setChecks([
        {
          id: 'robots',
          label: 'robots.txt reachable',
          detail: robots.ok ? `${robots.status} · ${robotsBody.split('\n').filter(Boolean).length} rules` : `HTTP ${robots.status}`,
          ok: robots.ok,
        },
        {
          id: 'unknown-agents',
          label: 'robots.txt closes the site to crawlers',
          detail: /User-Agent:\s*\*[\s\S]{0,80}?Disallow:\s*\/\s*(\n|$)/i.test(robotsBody)
            ? 'User-Agent: * → Disallow: / present'
            : 'No blanket Disallow rule found — this host is crawlable',
          ok: /User-Agent:\s*\*[\s\S]{0,80}?Disallow:\s*\/\s*(\n|$)/i.test(robotsBody),
        },
        {
          id: 'sitemap',
          label: 'sitemap.xml reachable',
          detail: sitemap.ok ? `${sitemap.status} · ${sitemapUrls} URLs` : `HTTP ${sitemap.status}`,
          ok: sitemap.ok,
        },
        {
          id: 'sitemap-catalog',
          label: 'Sitemap covers the catalog',
          detail:
            catalogStats === null
              ? 'Catalog could not be read, so coverage cannot be judged'
              : `${sitemapUrls} sitemap URLs against ${catalogStats.total} catalog products`,
          ok: catalogStats === null ? null : sitemapUrls >= catalogStats.total,
        },
        {
          id: 'noindex',
          label: 'X-Robots-Tag header matched',
          detail: robots.headers.get('x-robots-tag') ?? 'no X-Robots-Tag header on this response (the header is applied to page routes)',
          ok: robots.headers.get('x-robots-tag') ? /noindex/i.test(robots.headers.get('x-robots-tag') as string) : null,
        },
      ]);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to run crawler checks.'));
    } finally {
      setRunning(false);
    }
  }, []);

  useEffect(() => {
    runChecks();
  }, [runChecks]);

  return (
    <>
      <AdminPageHeader
        eyebrow="Growth"
        title="SEO centre"
        description="Crawler health for this deployment, and the SEO tools that arrive with the WordPress connection."
        actions={
          <button
            type="button"
            onClick={runChecks}
            className="inline-flex items-center gap-2 rounded-xl border border-admin-line bg-admin-surface px-4 py-2.5 text-sm font-semibold text-admin-ink transition-colors hover:bg-admin-canvas"
          >
            <RefreshCw size={16} />
            Re-run checks
          </button>
        }
      />

      {error && (
        <AdminNotice tone="danger" title="Checks could not run">
          {error}
        </AdminNotice>
      )}

      <div className="grid grid-cols-4 gap-4">
        <AdminStatTile
          label="Products indexed"
          icon={Search}
          tone="brand"
          value={stats?.total}
          unavailable={running ? 'Reading…' : stats === null ? 'Catalog unavailable' : undefined}
          hint={stats?.source === 'woocommerce' ? 'WooCommerce' : 'Supabase'}
        />
        <AdminStatTile
          label="Checks passed"
          icon={ShieldCheck}
          tone="green"
          value={running ? undefined : checks.filter((check) => check.ok === true).length}
          unavailable={running ? 'Running…' : undefined}
          hint={`${checks.length} checks`}
        />
        <AdminStatTile
          label="Checks failed"
          icon={XCircle}
          tone="amber"
          value={running ? undefined : checks.filter((check) => check.ok === false).length}
          unavailable={running ? 'Running…' : undefined}
        />
        <AdminStatTile
          label="SEO metadata managed"
          icon={Search}
          tone="slate"
          unavailable="WooCommerce required"
        />
      </div>

      <AdminPanel bodyClassName="px-5 pt-2 pb-0">
        <AdminTabs tabs={TABS} active={tab} onChange={setTab} />
      </AdminPanel>

      {tab === 'overview' && (
        <>
          <AdminPanel
            title="Crawler health for this deployment"
            description="Fetched live from this host when the page opened — robots.txt, sitemap.xml and the robots response header."
            action={<AdminChip tone={running ? 'muted' : 'info'}>{running ? 'Running' : 'Live'}</AdminChip>}
          >
            <table className="w-full">
              <tbody className="divide-y divide-admin-line">
                {running
                  ? Array.from({ length: 5 }, (_, index) => (
                      <tr key={index}>
                        <td className={ADMIN_TD}>
                          <div className="h-4 w-64 animate-pulse rounded bg-admin-canvas" />
                        </td>
                      </tr>
                    ))
                  : checks.map((check) => (
                      <tr key={check.id}>
                        <td className={ADMIN_TD}>
                          <div className="flex items-start gap-3">
                            {check.ok === true ? (
                              <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-600" />
                            ) : check.ok === false ? (
                              <XCircle size={17} className="mt-0.5 shrink-0 text-red-600" />
                            ) : (
                              <ShieldCheck size={17} className="mt-0.5 shrink-0 text-admin-muted" />
                            )}
                            <div>
                              <p className="font-medium text-admin-ink">{check.label}</p>
                              <p className="text-xs text-admin-muted">{check.detail}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </AdminPanel>

          <AdminPendingPanel
            title="SEO metadata, schema and redirects are not connected"
            summary="Product and category SEO fields live on the WordPress records. The console can read the catalog, but it cannot yet read or write those fields."
            needs={[
              'A WordPress/WooCommerce credential exposing product meta (yoast_head_json or the raw meta fields) server-side.',
              'Write access for meta title, meta description, canonical and Open Graph overrides.',
              'A redirect store — a WordPress plugin table or a deliberate, separate redirect table. Never a second product table.',
            ]}
            available={[
              'Storefront meta titles and descriptions are already generated from the catalog by one shared builder, so they cannot drift per page.',
              'Product structured data is emitted from the same product model the console lists.',
              'Sitemap and robots behaviour is verifiable live on this page.',
            ]}
          />
        </>
      )}

      {tab === 'product' && (
        <AdminPendingPanel
          title="Product and category SEO are not connected"
          summary="Editing meta titles, descriptions, canonicals and Open Graph values requires the WordPress product meta endpoints."
          needs={[
            'A WordPress/WooCommerce read credential for product meta, so the console can show what the page actually publishes.',
            'Write access to save overrides, with a preview of the rendered title and description before saving.',
            'A duplicate-title and duplicate-description audit over real meta, not over generated fallbacks.',
          ]}
        />
      )}

      {tab === 'content' && (
        <AdminPendingPanel
          title="Content audits are not connected"
          summary="Thin content, missing image alt text, broken internal links and content-gap analysis all need the product and post bodies from WordPress."
          needs={[
            'Read access to post and product content from WordPress staging.',
            'A crawl of this deployment to test internal links rather than guessing them.',
            'Image alt text from the WordPress media records the storefront serves.',
          ]}
        />
      )}

      {tab === 'technical' && (
        <>
          <AdminPanel
            title="Technical checks"
            description="The same live checks as the overview, listed with their raw values."
          >
            <table className="w-full">
              <thead>
                <tr className="border-b border-admin-line text-left">
                  <th className={`${ADMIN_TD} text-[11px] font-semibold uppercase tracking-[0.08em] text-admin-muted`}>
                    Check
                  </th>
                  <th className={`${ADMIN_TD} text-[11px] font-semibold uppercase tracking-[0.08em] text-admin-muted`}>
                    Observed
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-line">
                {checks.map((check) => (
                  <tr key={check.id}>
                    <td className={ADMIN_TD}>{check.label}</td>
                    <td className={`${ADMIN_TD} text-admin-muted`}>{check.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminPanel>

          <AdminPendingPanel
            title="Redirects and index coverage are not connected"
            summary="Redirect management and per-URL index coverage need a redirect store and a real crawl."
            needs={[
              'A redirect store with 301/302 rules and a hit counter.',
              'Search Console or an equivalent index-coverage feed for per-URL status.',
              'A scheduled crawl so broken links are found before a customer finds them.',
            ]}
          />
        </>
      )}

      {tab === 'ai' && <SeoAssistantPanel />}
    </>
  );
}
