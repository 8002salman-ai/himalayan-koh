'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, MessageSquare, RefreshCw, Star } from 'lucide-react';
import {
  ADMIN_TD,
  AdminButton,
  AdminChip,
  AdminNotice,
  AdminPageHeader,
  AdminPanel,
  AdminStatTile,
  AdminTable,
  AdminTableSkeleton,
  AdminTabs,
} from '../../components/admin/AdminUI';
import { fetchWordPressContent, type WordPressContent } from '../../lib/admin/consoleApi';
import { getErrorMessage } from '../../lib/errors';

type Tab = 'reviews' | 'comments' | 'policy';

const TABS: { id: Tab; label: string }[] = [
  { id: 'reviews', label: 'Ratings' },
  { id: 'comments', label: 'Published comments' },
  { id: 'policy', label: 'Moderation policy' },
];

/**
 * Reviews.
 *
 * Two hard facts shape this screen, and both were measured against the store
 * rather than assumed:
 *
 *  1. **WooCommerce's REST API has no reviews endpoint.** Reviews are WordPress
 *     comments of type `review`, and the comments route refuses the `type=review`
 *     filter to anyone without a WordPress user session — probing the live store
 *     returns `401 rest_forbidden_param`. The moderation queue is therefore
 *     unreachable with the credential this deployment holds, and the screen says
 *     so instead of showing an empty queue that reads as "nothing to moderate".
 *  2. **What is reachable is real.** WooCommerce reports each product's
 *     `average_rating` and `rating_count`, which is the same aggregate the product
 *     page shows, so the ratings table below is store data.
 *
 * A product with no reviews reports a rating of zero; showing that as a star rating
 * would be a claim about the product, so unrated products are counted and named as
 * unrated rather than listed at zero.
 */
export default function AdminReviews() {
  const [tab, setTab] = useState<Tab>('reviews');
  const [content, setContent] = useState<WordPressContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setContent(await fetchWordPressContent({ section: 'reviews' }));
    } catch (err) {
      setContent(null);
      setError(getErrorMessage(err, 'Reviews could not be read.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const ratings = content?.reviews?.ratings ?? [];
  const comments = content?.reviews?.approvedComments?.items ?? [];
  const rated = ratings.filter((rating) => rating.ratingCount > 0);
  const totalReviews = rated.reduce((sum, rating) => sum + rating.ratingCount, 0);
  const weighted = rated.reduce(
    (sum, rating) => sum + (rating.averageRating ?? 0) * rating.ratingCount,
    0
  );
  const average = totalReviews > 0 ? weighted / totalReviews : null;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Catalog"
        title="Reviews"
        description="Reviews and ratings, as the store and WordPress hold them."
        actions={
          <AdminButton icon={RefreshCw} onClick={load} disabled={loading}>
            Refresh
          </AdminButton>
        }
      />

      {error && (
        <AdminNotice tone="danger" title="Reviews could not be read">
          {error}
        </AdminNotice>
      )}

      {content?.capability.writeBlocker && (
        <AdminNotice tone="warning" title="The moderation queue is not reachable from here">
          {content.capability.writeBlocker}
        </AdminNotice>
      )}

      <div className="grid grid-cols-3 gap-4">
        <AdminStatTile
          label="Reviews in the store"
          icon={MessageSquare}
          tone="brand"
          value={loading ? undefined : totalReviews}
          unavailable={loading ? 'Reading…' : undefined}
          hint="Counted from what the store reports per product"
        />
        <AdminStatTile
          label="Average rating"
          icon={Star}
          tone={average === null ? 'slate' : 'green'}
          value={loading ? undefined : average === null ? undefined : average.toFixed(2)}
          unavailable={loading ? 'Reading…' : average === null ? 'No reviews yet' : undefined}
        />
        <AdminStatTile
          label="Products waiting on a first review"
          icon={Star}
          tone="slate"
          value={loading ? undefined : content?.reviews?.unrated}
          unavailable={loading ? 'Reading…' : undefined}
        />
      </div>

      <AdminTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'reviews' && (
        <AdminPanel
          title="Ratings by product"
          description="The store's own aggregate per product. Individual review text is not readable with the credential this deployment holds."
          action={<AdminChip tone="neutral">{rated.length} rated</AdminChip>}
        >
          <AdminTable
            columns={[
              { key: 'product', label: 'Product' },
              { key: 'average', label: 'Average', align: 'right' },
              { key: 'count', label: 'Reviews', align: 'right' },
            ]}
          >
            {loading ? (
              <AdminTableSkeleton rows={5} columns={3} />
            ) : rated.length === 0 ? (
              <tr>
                <td className={ADMIN_TD} colSpan={3}>
                  <p className="py-10 text-center text-sm text-admin-muted">
                    No product in the store has a review yet. Ratings appear here as soon as one does — they are
                    never seeded or estimated.
                  </p>
                </td>
              </tr>
            ) : (
              rated.map((rating) => (
                <tr key={rating.productId}>
                  <td className={ADMIN_TD}>
                    <p className="font-medium text-admin-ink">{rating.name}</p>
                    <p className="text-[11px] text-admin-muted">product {rating.productId}</p>
                  </td>
                  <td className={`${ADMIN_TD} text-right font-semibold`}>
                    {rating.averageRating === null ? '—' : rating.averageRating.toFixed(2)}
                  </td>
                  <td className={`${ADMIN_TD} text-right`}>{rating.ratingCount}</td>
                </tr>
              ))
            )}
          </AdminTable>
        </AdminPanel>
      )}

      {tab === 'comments' && (
        <AdminPanel
          title="Published comments"
          description="Approved comments WordPress returns publicly. The pending queue is not readable here."
          action={<AdminChip tone="neutral">{comments.length} published</AdminChip>}
        >
          {loading ? (
            <AdminTableSkeleton rows={4} columns={3} />
          ) : comments.length === 0 ? (
            <p className="text-sm text-admin-muted">
              WordPress reports no published comments on this site.
            </p>
          ) : (
            <ul className="space-y-3">
              {comments.map((comment) => (
                <li key={comment.id} className="rounded-xl border border-admin-line px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-admin-ink">
                      {comment.author ?? 'Anonymous'}
                    </p>
                    <p className="text-[11px] text-admin-muted">
                      {comment.date ? new Date(comment.date).toLocaleDateString() : ''}
                      {comment.type ? ` · ${comment.type}` : ''}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-admin-muted">{comment.content}</p>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>
      )}

      {tab === 'policy' && (
        <>
          <AdminPanel title="How reviews are handled" description="Applied consistently; stated once, here">
            <ul className="space-y-2.5 text-sm text-admin-ink">
              <li>
                A review is published under the name the customer gave, never edited to change its meaning. Replies
                are separate text.
              </li>
              <li>
                Reviews mentioning a delivery or payment problem are answered and then moderated, not deleted,
                unless they contain personal data.
              </li>
              <li>
                Only a customer who bought the product may leave a verified review; the badge is the store&apos;s,
                not a claim this console makes.
              </li>
              <li>
                Ratings are never adjusted, averaged with anything else, or seeded. A product with no reviews shows
                no rating rather than a placeholder star count.
              </li>
            </ul>
          </AdminPanel>

          <AdminPanel title="What approve, spam and trash would need" description="Named exactly, so it can be actioned">
            <ul className="space-y-2 text-sm text-admin-ink">
              <li>
                A <strong>WordPress application password</strong> for an administrator account, stored server-side.
                The WooCommerce consumer key in use authenticates WooCommerce endpoints only — it does not
                authenticate WordPress core, which is where comments live.
              </li>
              <li>
                Once that credential exists, moderation is WordPress&apos;s own comment status
                (<code>approved</code>, <code>hold</code>, <code>spam</code>, <code>trash</code>); no second
                moderation state would be invented here.
              </li>
            </ul>
          </AdminPanel>

          <div className="flex items-start gap-3 text-sm text-admin-muted">
            <AlertTriangle size={16} className="mt-0.5" />
            <p>
              Nothing on this screen deletes a customer&apos;s review without a confirmation that names the review,
              and nothing here can delete one at all yet — the credential that would do it is not configured.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
