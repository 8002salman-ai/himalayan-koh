import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, Search, Users } from 'lucide-react';
import { adminApi } from '../../lib/supabase/api/admin';
import { isSupabaseConfigured } from '../../lib/supabase/client';
import { getErrorMessage } from '../../lib/errors';
import type { Profile } from '../../lib/supabase/database.types';
import {
  ADMIN_TD,
  AdminButton,
  AdminChip,
  AdminNotice,
  AdminPageHeader,
  AdminPanel,
  AdminTable,
  AdminTableSkeleton,
} from '../../components/admin/AdminUI';
import { ICON_TILE, ICON_TILE_TONES, INPUT } from '../../components/admin/adminTheme';

const COLUMNS = [
  { key: 'customer', label: 'Customer', width: '40%' },
  { key: 'contact', label: 'Contact' },
  { key: 'role', label: 'Role' },
  { key: 'joined', label: 'Joined', align: 'right' as const },
];

/**
 * Customers.
 *
 * The table is the desktop table at every viewport — contact details live in
 * their own column rather than being folded into the name cell for small
 * screens, because the console keeps one layout. The empty state distinguishes
 * "no match for this search" from "no customers yet".
 */
export default function AdminCustomers() {
  const [customers, setCustomers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const connected = isSupabaseConfigured();

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    if (!isSupabaseConfigured()) {
      setCustomers([]);
      setLoading(false);
      return;
    }

    try {
      setFetchError(null);
      const result = await adminApi.getCustomers({ search: search || undefined, page, limit: 12 });
      setCustomers(result.customers);
      setTotalPages(result.totalPages);
      setTotalCount(result.count);
    } catch (err) {
      setFetchError(getErrorMessage(err, 'Failed to load customers.'));
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  return (
    <>
      <AdminPageHeader
        eyebrow="Commerce"
        title="Customers"
        description="Registered customer accounts, read from the authentication provider the storefront signs in against."
        actions={
          <AdminButton icon={Users} onClick={fetchCustomers} disabled={loading}>
            Refresh
          </AdminButton>
        }
      />

      {!connected && (
        <AdminNotice tone="warning" title="Customer accounts are not connected">
          Supabase holds the customer profiles and this deployment has no configuration for it, so the
          table below is empty rather than filled from another source.
        </AdminNotice>
      )}

      {fetchError && (
        <AdminNotice tone="danger" title="Customers could not be loaded">
          {fetchError}
        </AdminNotice>
      )}

      <AdminPanel bodyClassName="px-0 py-0">
        <div className="flex items-center gap-3 border-b border-admin-line px-5 py-4">
          <div className="relative min-w-[320px] flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-admin-muted"
            />
            <input
              type="text"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
              placeholder="Search by name, email, or phone…"
              aria-label="Search customers"
              className={`${INPUT} w-full pl-10`}
            />
          </div>
          <span className="ml-auto text-[11px] font-semibold uppercase tracking-[0.08em] text-admin-muted">
            {loading ? 'Reading…' : `${totalCount} customer${totalCount === 1 ? '' : 's'}`}
          </span>
        </div>

        <AdminTable columns={COLUMNS}>
          {loading ? (
            <AdminTableSkeleton rows={5} columns={COLUMNS.length} />
          ) : customers.length === 0 ? (
            <tr>
              <td className={ADMIN_TD} colSpan={COLUMNS.length}>
                <div className="flex flex-col items-center gap-2 py-16 text-center">
                  <span className={`${ICON_TILE} ${ICON_TILE_TONES.slate} h-11 w-11`}>
                    <Users size={20} />
                  </span>
                  <p className="text-sm font-semibold text-admin-ink">
                    {search ? 'No customers match this search' : 'No customer accounts yet'}
                  </p>
                  <p className="text-sm text-admin-muted">
                    {search
                      ? 'Try a different name, email or phone number.'
                      : connected
                        ? 'Accounts appear here as soon as someone signs up.'
                        : 'Connect the authentication provider to read accounts.'}
                  </p>
                </div>
              </td>
            </tr>
          ) : (
            customers.map((customer) => (
              <tr key={customer.id}>
                <td className={ADMIN_TD}>
                  <div className="flex items-center gap-3">
                    <span className={`${ICON_TILE} ${ICON_TILE_TONES.brand}`}>
                      {(customer.full_name || customer.email || 'C').slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-admin-ink">
                        {customer.full_name || 'Unnamed customer'}
                      </p>
                      <p className="truncate text-[11px] text-admin-muted">{customer.email}</p>
                    </div>
                  </div>
                </td>
                <td className={`${ADMIN_TD} text-admin-muted`}>
                  <p className="flex items-center gap-1.5">
                    <Mail size={14} className="shrink-0" />
                    <span className="truncate">{customer.email || '—'}</span>
                  </p>
                  {customer.phone && (
                    <p className="mt-1 flex items-center gap-1.5">
                      <Phone size={14} className="shrink-0" />
                      {customer.phone}
                    </p>
                  )}
                </td>
                <td className={ADMIN_TD}>
                  <AdminChip tone={customer.role === 'admin' ? 'brand' : 'neutral'}>
                    {customer.role === 'admin' ? 'Super Admin' : customer.role}
                  </AdminChip>
                </td>
                <td className={`${ADMIN_TD} text-right text-admin-muted`}>
                  {new Date(customer.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))
          )}
        </AdminTable>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-admin-line px-5 py-3">
            <p className="text-sm text-admin-muted">
              Page {page} of {totalPages} · {totalCount} customers
            </p>
            <div className="flex gap-2">
              <AdminButton onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
                Previous
              </AdminButton>
              <AdminButton onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>
                Next
              </AdminButton>
            </div>
          </div>
        )}
      </AdminPanel>

      <p className="text-sm text-admin-muted">
        Order history for a customer lives on the{' '}
        <Link to="/admin/orders" className="font-semibold text-himalayan hover:underline">
          Orders
        </Link>{' '}
        page — it is not duplicated here.
      </p>
    </>
  );
}
