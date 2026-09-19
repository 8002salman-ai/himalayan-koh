'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image as ImageIcon, RefreshCw, UploadCloud } from 'lucide-react';
import {
  ADMIN_TD,
  AdminButton,
  AdminChip,
  AdminNotice,
  AdminPageHeader,
  AdminPanel,
  AdminStatTile,
  AdminTable,
  AdminTabs,
} from '../../components/admin/AdminUI';
import { fetchWordPressContent, type WordPressContent } from '../../lib/admin/consoleApi';
import { getErrorMessage } from '../../lib/errors';

type Tab = 'library' | 'gallery';

const TABS: { id: Tab; label: string }[] = [
  { id: 'library', label: 'WordPress library' },
  { id: 'gallery', label: 'Images on the storefront' },
];

function formatBytes(bytes: number | null): string {
  if (bytes === null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Media.
 *
 * The library is read from WordPress itself, so this screen shows the assets that
 * actually exist in the site's media library — with their alt text, dimensions,
 * file size and where they came from — rather than a list derived from whatever
 * products happen to reference an image. That distinction matters: an image with
 * no alt text, or one nothing references, is invisible if you only look at
 * products, and unreferenced assets are the usual cause of a bloated library.
 *
 * Uploading and deleting need a WordPress user session and are not offered. The
 * screen names the one credential that would enable them instead of showing a
 * disabled button with no reason.
 */
export default function AdminMedia() {
  const [tab, setTab] = useState<Tab>('library');
  const [content, setContent] = useState<WordPressContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setContent(await fetchWordPressContent({ section: 'media', search: search || undefined }));
    } catch (err) {
      setContent(null);
      setError(getErrorMessage(err, 'The media library could not be read.'));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  const [onlyMissingAlt, setOnlyMissingAlt] = useState(false);

  const media = useMemo(() => content?.media?.items ?? [], [content?.media?.items]);
  const missingAlt = useMemo(() => media.filter((item) => !item.alt), [media]);
  const totalBytes = useMemo(
    () => media.reduce((sum, item) => sum + (item.bytes ?? 0), 0),
    [media]
  );
  const displayedMedia = useMemo(() => {
    return onlyMissingAlt ? media.filter((item) => !item.alt) : media;
  }, [media, onlyMissingAlt]);

  return (
    <>
      <AdminPageHeader
        eyebrow="Content"
        title="Media"
        description="The WordPress staging media library: what exists, its alt text, and what it costs in size."
        actions={
          <AdminButton icon={RefreshCw} onClick={load} disabled={loading}>
            Refresh
          </AdminButton>
        }
      />

      {error && (
        <AdminNotice tone="danger" title="The media library could not be read">
          {error}
        </AdminNotice>
      )}

      {content?.media?.error && (
        <AdminNotice tone="warning" title="WordPress refused the media read">
          {content.media.error}
        </AdminNotice>
      )}

      <div className="grid grid-cols-4 gap-4">
        <AdminStatTile
          label="Images in the library"
          icon={ImageIcon}
          tone="brand"
          value={loading ? undefined : media.length}
          unavailable={loading ? 'Reading…' : undefined}
        />
        <AdminStatTile
          label="Missing alt text"
          icon={ImageIcon}
          tone={missingAlt.length > 0 ? 'amber' : 'green'}
          value={loading ? undefined : missingAlt.length}
          unavailable={loading ? 'Reading…' : undefined}
          hint="Alt text is what a screen reader announces"
        />
        <AdminStatTile
          label="Served from"
          icon={ImageIcon}
          tone="slate"
          value={loading || !content ? undefined : content.capability.origin ? 'WordPress' : undefined}
          unavailable={loading ? 'Reading…' : content?.capability.origin ? undefined : 'No origin configured'}
        />
        <AdminStatTile
          label="Total size"
          icon={ImageIcon}
          tone="slate"
          value={loading ? undefined : formatBytes(totalBytes || null)}
          unavailable={loading ? 'Reading…' : undefined}
        />
      </div>

      <AdminTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'library' && (
        <AdminPanel
          title="Media library"
          description="Every image WordPress reports, newest first."
          action={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOnlyMissingAlt((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                  onlyMissingAlt
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-600'
                    : 'border-admin-line bg-admin-surface text-admin-ink hover:bg-admin-canvas'
                }`}
              >
                Missing alt only ({missingAlt.length})
              </button>
              <AdminChip tone="neutral">{displayedMedia.length} assets</AdminChip>
            </div>
          }
        >
          <div className="mb-4">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search the library…"
              aria-label="Search media"
              className="w-full max-w-md rounded-xl border border-admin-line bg-admin-surface px-3 py-2.5 text-sm"
            />
          </div>

          {loading ? (
            <div className="grid grid-cols-6 gap-4">
              {Array.from({ length: 12 }, (_, index) => (
                <div key={index} className="h-32 animate-pulse rounded-xl bg-admin-canvas" />
              ))}
            </div>
          ) : displayedMedia.length === 0 ? (
            <p className="text-sm text-admin-muted">
              {search
                ? 'No asset matches that search.'
                : onlyMissingAlt
                  ? 'All assets have alt text.'
                  : 'WordPress reported no media.'}
            </p>
          ) : (
            <div className="grid grid-cols-6 gap-4">
              {displayedMedia.map((item) => (
                <figure key={item.id} className="overflow-hidden rounded-xl border border-admin-line">
                  <img
                    src={item.thumbnail ?? item.url ?? '/images/placeholder-product.svg'}
                    alt={item.alt ?? ''}
                    className="h-28 w-full bg-admin-canvas object-cover"
                    onError={(event) => {
                      (event.target as HTMLImageElement).src = '/images/placeholder-product.svg';
                    }}
                  />
                  <figcaption className="px-2.5 py-2">
                    <p className="truncate text-[11px] font-medium text-admin-ink" title={item.title}>
                      {item.title}
                    </p>
                    <p className="truncate text-[11px] text-admin-muted">
                      {item.width && item.height ? `${item.width}×${item.height} · ` : ''}
                      {formatBytes(item.bytes)}
                    </p>
                    {item.alt ? (
                      <p className="mt-1 truncate text-[11px] text-admin-muted" title={item.alt}>
                        alt: {item.alt}
                      </p>
                    ) : (
                      <p className="mt-1 text-[11px] font-semibold text-amber-600">No alt text</p>
                    )}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </AdminPanel>
      )}

      {tab === 'gallery' && (
        <AdminPanel
          title="Images the storefront serves"
          description="Read from the catalog, so this is exactly what a shopper is shown."
        >
          <AdminTable
            columns={[
              { key: 'product', label: 'Product' },
              { key: 'count', label: 'Images', align: 'right' },
            ]}
          >
            <tr>
              <td className={ADMIN_TD} colSpan={2}>
                <p className="text-sm text-admin-muted">
                  Switch to the library tab for the assets themselves. The product gallery is the catalog&apos;s
                  own image fields, which the Pages screen already reads; duplicating it here would be a second
                  list to keep in sync.
                </p>
              </td>
            </tr>
          </AdminTable>
        </AdminPanel>
      )}

      <AdminPanel title="Upload is not available from this console" description="The exact credential, not a vague requirement">
        <div className="flex items-start gap-4 rounded-xl border border-dashed border-admin-line px-5 py-6">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-admin-canvas text-admin-muted">
            <UploadCloud size={20} />
          </span>
          <div>
            <p className="text-sm font-semibold text-admin-ink">A WordPress user session is required to upload</p>
            <p className="mt-0.5 text-sm text-admin-muted">
              {content?.capability.writeBlocker ??
                'Uploads, replacements and deletes need an authenticated WordPress user; the media read above does not.'}
            </p>
          </div>
        </div>
      </AdminPanel>
    </>
  );
}
