'use client';

import { useState } from 'react';
import { AlertTriangle, MessageSquare, RefreshCw, Star } from 'lucide-react';
import {
  AdminCapabilityPanel,
  AdminChip,
  AdminNotice,
  AdminPageHeader,
  AdminPanel,
  AdminPendingChip,
  AdminStatTile,
  AdminTabs,
} from '../../components/admin/AdminUI';
import { useAdminCatalog } from '../../lib/admin/useAdminCatalog';
import { catalogSourceLabel } from '../../lib/admin/capabilities';

type Tab = 'pending' | 'published' | 'policy';

const TABS: { id: Tab; label: string }[] = [
  { id: 'pending', label: 'Awaiting moderation' },
  { id: 'published', label: 'Published' },
  { id: 'policy', label: 'Moderation policy' },
];

/**
 * Reviews.
 *
 * Product reviews are WooCommerce records, and reading them needs the store's
 * REST key — there is no public endpoint for a moderation queue. So the counting
 * tiles say *not connected* instead of "0 reviews", which on a store that may
 * well have reviews would be a false statement rather than an empty one.
 *
 * The parts that are real: which catalog products exist to review, and the
 * moderation policy the store actually applies.
 */
export default function AdminReviews() {
  const [tab, setTab] = useState<Tab>('pending');
  const { rows, warnings, loading, error, reload } = useAdminCatalog({ sort: 'name' });

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Catalog"
        title="Reviews"
        description="Customer reviews and ratings, moderated before they appear on a product page."
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
          label="Awaiting moderation"
          icon={MessageSquare}
          tone="slate"
          unavailable="Not connected"
        />
        <AdminStatTile
          label="Average rating"
          icon={Star}
          tone="slate"
          unavailable="Not connected"
        />
        <AdminStatTile
          label="Reviewable products"
          icon={Star}
          tone="brand"
          value={loading ? '—' : rows.length}
          hint={`${catalogSourceLabel()} catalog`}
        />
      </div>

      <AdminTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'pending' && (
        <AdminCapabilityPanel
          title="Moderation queue"
          summary="Every review waiting for approve, reject or reply, newest first."
          capabilities={['woo-rest-read', 'woo-write']}
          available={[
            `${rows.length} products are readable from ${catalogSourceLabel()}, so the queue's product links will resolve as soon as the key exists.`,
            'Approving and rejecting are WooCommerce operations, so the console will call Woo rather than keeping a parallel copy of a rating.',
          ]}
        />
      )}

      {tab === 'published' && (
        <AdminCapabilityPanel
          title="Published reviews"
          summary="What is currently visible on each product page, with the rating it contributes."
          capabilities={['woo-rest-read']}
          available={[
            'Product pages already render the rating WooCommerce reports; this screen is the moderation side of the same records.',
          ]}
        />
      )}

      {tab === 'policy' && (
        <>
          <AdminPanel title="How reviews are handled" description="Applied consistently; stated once, here">
            <ul className="space-y-2.5 text-sm text-admin-ink">
              <li>
                A review is published under the name the customer gave, never edited to change its
                meaning. Replies are separate text.
              </li>
              <li>
                Reviews mentioning a delivery or payment problem are answered and then moderated,
                not deleted, unless they contain personal data.
              </li>
              <li>
                Only a customer who bought the product may leave a verified review; the badge is
                WooCommerce&apos;s, not a claim this console makes.
              </li>
              <li>
                Ratings are never adjusted, averaged with anything else, or seeded. A product with no
                reviews shows no rating rather than a placeholder star count.
              </li>
            </ul>
          </AdminPanel>

          <AdminPanel
            title="Products that can be reviewed"
            description={`Read from ${catalogSourceLabel()}`}
          >
            <div className="flex flex-wrap gap-2">
              {loading && <span className="text-sm text-admin-muted">Reading catalog…</span>}
              {!loading && rows.length === 0 && (
                <span className="text-sm text-admin-muted">The catalog source reported no products.</span>
              )}
              {rows.map((row) => (
                <AdminChip key={row.id} tone="muted">
                  {row.name}
                </AdminChip>
              ))}
            </div>
          </AdminPanel>

          <AdminNotice tone="info" title="Spam handling">
            Reviews flagged by WooCommerce&apos;s own spam check stay in the queue with the flag
            visible; this console does not run a second spam classifier with its own thresholds.
          </AdminNotice>

          <div className="flex items-start gap-3 text-sm text-admin-muted">
            <AlertTriangle size={16} className="mt-0.5" />
            <p>
              Nothing on this screen deletes a customer&apos;s review without a confirmation that
              names the review.
            </p>
          </div>
        </>
      )}

      {warnings.map((warning) => (
        <AdminNotice key={warning} tone="info" title="Adapter note">
          {warning}
        </AdminNotice>
      ))}
    </div>
  );
}
