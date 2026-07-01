import { useCallback, useEffect, useState } from 'react';
import { Package, Save, Search } from 'lucide-react';
import DealerManagementTabs from '../../../components/admin/dealer/DealerManagementTabs';
import { Button } from '../../../components/ui';
import { SkeletonTable } from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import { adminDealerApi, dealerApi } from '../../../lib/supabase/api';
import { useAuthContext } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { isSupabaseConfigured } from '../../../lib/supabase/client';
import { getErrorMessage } from '../../../lib/errors';
import type { Product } from '../../../lib/supabase/database.types';

export default function AdminDealerPricing() {
  const { user } = useAuthContext();
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { dealer_price: string; moq: string; dealer_only: boolean; retail_only: boolean }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    if (!isSupabaseConfigured()) { setLoading(false); return; }
    try {
      const catalog = await dealerApi.getDealerCatalog();
      setProducts(catalog);
      setDrafts(
        Object.fromEntries(
          catalog.map((p) => [
            p.id,
            {
              dealer_price: p.dealer_price != null ? String(p.dealer_price) : '',
              moq: String(p.moq ?? 1),
              dealer_only: p.dealer_only,
              retail_only: p.retail_only,
            },
          ])
        )
      );
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load products.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const handleSave = async (productId: string) => {
    if (!user?.id) return;
    const draft = drafts[productId];
    setSavingId(productId);
    try {
      await adminDealerApi.updateProductPricing(productId, user.id, {
        dealerPrice: draft.dealer_price ? Number(draft.dealer_price) : null,
        moq: Number(draft.moq) || 1,
        dealerOnly: draft.dealer_only,
        retailOnly: draft.retail_only,
      });
      toast.success('Dealer pricing updated.');
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save pricing.'));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Dealer Management</h1>
        <p className="text-charcoal-light">Set dealer/wholesale pricing, MOQ, and catalog visibility per product</p>
      </div>

      <DealerManagementTabs />

      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4"><SkeletonTable rows={5} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Package size={40} />} title="No products found" size="compact" className="border-0 shadow-none rounded-none py-16" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide">Retail Price</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide">Dealer Price</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide">MOQ</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide hidden sm:table-cell">Dealer Only</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide hidden sm:table-cell">Retail Only</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((product) => {
                  const draft = drafts[product.id];
                  if (!draft) return null;
                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-charcoal max-w-xs truncate">{product.name}</td>
                      <td className="px-4 py-3 text-sm text-charcoal-light">${product.price.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.01"
                          value={draft.dealer_price}
                          onChange={(e) => setDrafts((d) => ({ ...d, [product.id]: { ...d[product.id], dealer_price: e.target.value } }))}
                          placeholder="—"
                          className="w-24 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-himalayan/30"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={1}
                          value={draft.moq}
                          onChange={(e) => setDrafts((d) => ({ ...d, [product.id]: { ...d[product.id], moq: e.target.value } }))}
                          className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-himalayan/30"
                        />
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <input
                          type="checkbox"
                          checked={draft.dealer_only}
                          onChange={(e) => setDrafts((d) => ({ ...d, [product.id]: { ...d[product.id], dealer_only: e.target.checked } }))}
                          className="w-4 h-4 rounded border-gray-300 text-himalayan focus:ring-himalayan"
                        />
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <input
                          type="checkbox"
                          checked={draft.retail_only}
                          onChange={(e) => setDrafts((d) => ({ ...d, [product.id]: { ...d[product.id], retail_only: e.target.checked } }))}
                          className="w-4 h-4 rounded border-gray-300 text-himalayan focus:ring-himalayan"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" onClick={() => handleSave(product.id)} isLoading={savingId === product.id} leftIcon={<Save size={14} />}>
                          Save
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
