'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  readAdminCatalogPage,
  readAdminCatalogStats,
  type AdminCatalogFacet,
  type AdminCatalogRow,
  type AdminCatalogSort,
  type AdminCatalogStats,
} from '../backend';
import { getErrorMessage } from '../errors';

export interface AdminCatalogState {
  rows: AdminCatalogRow[];
  stats: AdminCatalogStats | null;
  facets: AdminCatalogFacet[];
  /** Source-level notes from the adapter, e.g. "this source reports no SKU". */
  warnings: string[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Reads the admin catalog once for a screen that needs the whole list.
 *
 * Every admin module that shows products had grown its own copy of the same
 * load/stats/error/finally block, so each one refreshed differently and reported
 * failure differently. This is that block, once: it always fetches the page and
 * the stats together (they come from the same adapter and the same source, so
 * fetching them separately was two round trips for one question), and it clears
 * rows on failure rather than leaving a stale list under an error banner.
 *
 * It never invents a value: a source that cannot report price, SKU or stock
 * leaves the matching `missing` entries on the row, and the caller decides how to
 * say so.
 */
export function useAdminCatalog(
  options: { perPage?: number; sort?: AdminCatalogSort; search?: string } = {}
): AdminCatalogState {
  const { perPage = 100, sort = 'name', search } = options;

  const [rows, setRows] = useState<AdminCatalogRow[]>([]);
  const [stats, setStats] = useState<AdminCatalogStats | null>(null);
  const [facets, setFacets] = useState<AdminCatalogFacet[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [page, catalogStats] = await Promise.all([
        readAdminCatalogPage({ perPage, sort, search }),
        readAdminCatalogStats(),
      ]);
      setRows(page.rows);
      setFacets(page.facets);
      setWarnings(page.warnings);
      setStats(catalogStats);
    } catch (err) {
      setRows([]);
      setFacets([]);
      setStats(null);
      setError(getErrorMessage(err, 'Unable to read the catalog.'));
    } finally {
      setLoading(false);
    }
  }, [perPage, sort, search]);

  useEffect(() => {
    void load();
  }, [load]);

  return { rows, stats, facets, warnings, loading, error, reload: load };
}
