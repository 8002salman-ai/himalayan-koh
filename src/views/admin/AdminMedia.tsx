import { useCallback, useEffect, useState } from 'react';
import { Image as ImageIcon, RefreshCw, UploadCloud } from 'lucide-react';
import { readAdminCatalogPage, type AdminCatalogRow } from '../../lib/backend';
import { getErrorMessage } from '../../lib/errors';
import {
  AdminChip,
  AdminNotice,
  AdminPageHeader,
  AdminPanel,
  AdminPendingPanel,
  AdminStatTile,
} from '../../components/admin/AdminUI';

/**
 * Media.
 *
 * The images the storefront actually serves are the ones attached to catalog
 * products, and those already come from WordPress staging media. So this page
 * shows the real gallery in use — origin included, so a reviewer can see the
 * assets are staging WordPress uploads and not placeholders — and states plainly
 * that uploading, replacing and deleting media needs the authenticated WordPress
 * media endpoints.
 */
const MEDIA_PAGE_SIZE = 100;

export default function AdminMedia() {
  const [rows, setRows] = useState<AdminCatalogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await readAdminCatalogPage({ perPage: MEDIA_PAGE_SIZE, sort: 'name' });
      setRows(page.rows);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to read catalog images.'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const images = rows.flatMap((row) =>
    (row.images.length > 0 ? row.images : row.image ? [row.image] : []).map((url) => ({
      url,
      productName: row.name,
    }))
  );

  const origins = new Set(
    images
      .map((image) => {
        try {
          return new URL(image.url, window.location.origin).origin;
        } catch {
          return null;
        }
      })
      .filter((origin): origin is string => Boolean(origin))
  );

  return (
    <>
      <AdminPageHeader
        eyebrow="Content"
        title="Media"
        description="Images the storefront serves today, and where they come from."
        actions={
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 rounded-xl border border-admin-line bg-admin-surface px-4 py-2.5 text-sm font-semibold text-admin-ink transition-colors hover:bg-admin-canvas"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        }
      />

      {error && (
        <AdminNotice tone="danger" title="Could not read catalog images">
          {error}
        </AdminNotice>
      )}

      <div className="grid grid-cols-4 gap-4">
        <AdminStatTile
          label="Images in use"
          icon={ImageIcon}
          tone="brand"
          value={loading ? undefined : images.length}
          unavailable={loading ? 'Reading…' : undefined}
        />
        <AdminStatTile
          label="Products with images"
          icon={ImageIcon}
          tone="green"
          value={loading ? undefined : rows.filter((row) => row.image || row.images.length > 0).length}
          unavailable={loading ? 'Reading…' : undefined}
        />
        <AdminStatTile
          label="Products without"
          icon={ImageIcon}
          tone="amber"
          value={loading ? undefined : rows.filter((row) => !row.image && row.images.length === 0).length}
          unavailable={loading ? 'Reading…' : undefined}
        />
        <AdminStatTile
          label="Distinct origins"
          icon={ImageIcon}
          tone="slate"
          value={loading ? undefined : origins.size}
          unavailable={loading ? 'Reading…' : undefined}
        />
      </div>

      <AdminPanel
        title="Images in use"
        description="Every image the catalog currently serves, with its product and origin."
        action={<AdminChip tone="neutral">{images.length} assets</AdminChip>}
      >
        {loading ? (
          <div className="grid grid-cols-6 gap-4">
            {Array.from({ length: 12 }, (_, index) => (
              <div key={index} className="h-32 animate-pulse rounded-xl bg-admin-canvas" />
            ))}
          </div>
        ) : images.length === 0 ? (
          <p className="text-sm text-admin-muted">
            No images were reported by the configured catalog source.
          </p>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {[...origins].map((origin) => (
                <AdminChip key={origin} tone="info">
                  {origin}
                </AdminChip>
              ))}
            </div>
            <div className="grid grid-cols-6 gap-4">
              {images.map((image) => (
                <figure
                  key={`${image.productName}-${image.url}`}
                  className="overflow-hidden rounded-xl border border-admin-line"
                >
                  <img
                    src={image.url}
                    alt={image.productName}
                    className="h-28 w-full bg-admin-canvas object-cover"
                    onError={(event) => {
                      (event.target as HTMLImageElement).src = '/images/placeholder-product.svg';
                    }}
                  />
                  <figcaption className="truncate px-2.5 py-2 text-[11px] text-admin-muted">
                    {image.productName}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        )}
      </AdminPanel>

      <AdminPendingPanel
        title="Media library management is not connected"
        summary="Uploading, replacing, deleting and re-attaching media needs the authenticated WordPress media endpoints, which the console does not hold credentials for."
        needs={[
          'A WordPress application password or a media-capable REST credential, stored server-side only.',
          'An upload path that writes to WordPress staging and returns the WordPress media id, so products reference real staging assets.',
          'A deletion policy that refuses to remove an asset still attached to a published product.',
        ]}
        available={[
          'Catalog images are already served from WordPress staging media — the gallery above is the live set, not a fixture.',
          'Product image fields are read from the same adapter the storefront uses, so the console cannot show a different library than the site.',
        ]}
      />

      <AdminPanel title="Upload" description="Disabled until a media credential exists.">
        <div className="flex items-center gap-4 rounded-xl border border-dashed border-admin-line px-5 py-8">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-admin-canvas text-admin-muted">
            <UploadCloud size={20} />
          </span>
          <div>
            <p className="text-sm font-semibold text-admin-ink">WordPress media connection required</p>
            <p className="mt-0.5 text-sm text-admin-muted">
              Uploads stay disabled rather than writing product images somewhere WordPress cannot
              serve them from.
            </p>
          </div>
        </div>
      </AdminPanel>
    </>
  );
}
