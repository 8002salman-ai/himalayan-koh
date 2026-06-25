import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Mail, Phone, Search, Users } from 'lucide-react';
import { Button } from '../../components/ui';
import { adminApi } from '../../lib/supabase/api/admin';
import { isSupabaseConfigured } from '../../lib/supabase/client';
import { getErrorMessage } from '../../lib/errors';
import type { Profile } from '../../lib/supabase/database.types';

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

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
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Customers</h1>
        <p className="text-charcoal-light">Manage registered customer accounts</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, email, or phone..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan"
          />
        </div>
      </div>

      {fetchError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">Customers could not be loaded.</p>
          <p className="mt-1">{fetchError}</p>
          <Button variant="destructive" size="sm" onClick={fetchCustomers} className="mt-2">
            Retry
          </Button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={32} className="animate-spin text-himalayan" />
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-20 text-charcoal-light">No customers found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-himalayan/10 flex items-center justify-center">
                          <Users size={18} className="text-himalayan" />
                        </div>
                        <div>
                          <p className="font-medium text-charcoal">{customer.full_name || 'Unnamed customer'}</p>
                          <p className="text-xs text-charcoal-light capitalize">{customer.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-charcoal-light">
                      <p className="flex items-center gap-1"><Mail size={14} />{customer.email}</p>
                      {customer.phone && <p className="flex items-center gap-1 mt-1"><Phone size={14} />{customer.phone}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-charcoal-light">
                      {new Date(customer.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-charcoal-light">
          <span>Showing page {page} of {totalPages} ({totalCount} customers)</span>
          <div className="flex gap-2">
            <button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 border rounded-lg disabled:opacity-50">Previous</button>
            <button type="button" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 border rounded-lg disabled:opacity-50">Next</button>
          </div>
        </div>
      )}

      <p className="text-sm text-charcoal-light">
        View order history from the <Link to="/admin/orders" className="text-himalayan font-semibold hover:underline">Orders</Link> page.
      </p>
    </div>
  );
}

