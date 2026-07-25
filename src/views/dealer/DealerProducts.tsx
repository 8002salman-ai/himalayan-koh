import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Search, ShoppingCart, Zap } from 'lucide-react';
import { dealerApi, dealerUnitPrice } from '../../lib/supabase/api';
import { supabase, isSupabaseConfigured } from '../../lib/supabase/client';
import { useCart } from '../../store/cartStore';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../lib/errors';
import type { Product } from '../../lib/supabase/database.types';
import { getAvailability, type InventoryLike } from '../../lib/inventory/availability';
import { Button } from '../../components/ui';
import { SkeletonProductGrid } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

export default function DealerProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [inventoryByProduct, setInventoryByProduct] = useState<Record<string, InventoryLike>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const { addItem } = useCart();
  const toast = useToast();

  // A failed fetch (schema drift, RLS misconfiguration, network error, ...)
  // must never look identical to "there genuinely are no products" — that
  // conflation is exactly what hid a real bug (a pending migration) behind
  // a misleading empty state previously. See docs/MIGRATIONS.md.
  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const catalog = await dealerApi.getDealerCatalog();
      setProducts(catalog);
      setQuantities(Object.fromEntries(catalog.map((p) => [p.id, p.moq || 1])));

      // Availability is advisory here — the authoritative check happens
      // server-side on submission and again at conversion (see
      // checkPurchaseRequestStock.ts / migration 021).
      const { data: inventoryRows } = await supabase
        .from('inventory')
        .select('product_id, quantity, reserved_quantity, low_stock_threshold, track_inventory, allow_backorder')
        .in('product_id', catalog.map((p) => p.id));
      const map: Record<string, InventoryLike> = {};
      for (const row of (inventoryRows || []) as (InventoryLike & { product_id: string })[]) {
        map[row.product_id] = row;
      }
      setInventoryByProduct(map);
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to load wholesale catalog.');
      console.error('Failed to load dealer catalog:', err);
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const setQuantity = (product: Product, value: number) => {
    const moq = product.moq || 1;
    setQuantities((q) => ({ ...q, [product.id]: Math.max(moq, Math.round(value) || moq) }));
  };

  const handleAddToCart = async (product: Product) => {
    const quantity = quantities[product.id] || product.moq || 1;
    try {
      await addItem({
        id: product.id,
        name: product.name,
        price: dealerUnitPrice(product),
        image: product.thumbnail || product.images?.[0] || '',
      }, quantity);
      toast.success(`Added ${quantity} units of ${product.name} to cart.`);
    } catch {
      toast.error('Failed to add item to cart.');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Wholesale Catalog</h1>
        <p className="text-charcoal-light">Products shown at your wholesale pricing — set a quantity and add straight to your order</p>
      </div>

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

      {loading ? (
        <SkeletonProductGrid count={6} />
      ) : loadError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertTriangle size={32} className="mx-auto text-red-500 mb-3" />
          <p className="font-semibold text-red-700 mb-1">The wholesale catalog couldn&apos;t be loaded</p>
          <p className="text-sm text-red-600 mb-4">{loadError}</p>
          <Button variant="destructive" size="sm" onClick={load}>
            Retry
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart size={40} />}
          title="No products found"
          description="Wholesale products will appear here once available."
          size="compact"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((product) => {
            const dealerPrice = dealerUnitPrice(product);
            const moq = product.moq || 1;
            const quantity = quantities[product.id] || moq;
            const availability = getAvailability(inventoryByProduct[product.id]);
            return (
              <div key={product.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="aspect-square bg-gray-50 relative">
                  <img
                    src={product.thumbnail || product.images?.[0] || '/images/placeholder-product.svg'}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/images/placeholder-product.svg'; }}
                  />
                  <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-semibold ${availability.badgeClass}`}>
                    {availability.label}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-charcoal text-sm leading-snug line-clamp-2 mb-2 min-h-10">
                    {product.name}
                  </h3>
                  <div className="mb-1">
                    <span className="text-himalayan font-bold text-lg">${dealerPrice.toFixed(2)}</span>
                    <span className="text-xs text-charcoal-light ml-1.5 uppercase tracking-wide">Wholesale Price</span>
                  </div>
                  <p className="text-xs text-charcoal-light mb-1">MOQ: {moq} units · Bulk quantity supported</p>
                  {product.pack_size && (
                    <p className="text-xs text-charcoal-light mb-1">Pack size: {product.pack_size}</p>
                  )}
                  {product.lead_time_days != null && (
                    <p className="text-xs text-charcoal-light mb-3">Lead time: ~{product.lead_time_days} day{product.lead_time_days === 1 ? '' : 's'}</p>
                  )}
                  {!product.pack_size && product.lead_time_days == null && <div className="mb-3" />}

                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setQuantity(product, quantity - 1)}
                        className="px-3 py-2 text-sm hover:bg-gray-100 transition-colors font-semibold text-charcoal"
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={moq}
                        value={quantity}
                        onChange={(e) => setQuantity(product, Number(e.target.value))}
                        className="w-14 px-1 py-2 text-sm font-medium text-center border-x border-gray-200 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setQuantity(product, quantity + 1)}
                        className="px-3 py-2 text-sm hover:bg-gray-100 transition-colors font-semibold text-charcoal"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-xs text-charcoal-light">
                      = ${(dealerPrice * quantity).toFixed(2)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddToCart(product)}
                    className="w-full flex items-center justify-center gap-2 min-h-11 bg-himalayan hover:bg-himalayan-dark text-white font-semibold text-sm rounded-xl transition-colors"
                  >
                    <ShoppingCart size={16} />
                    Add to Order
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-charcoal-light">
          <Zap size={12} className="text-himalayan" />
          Quick order: adjust quantity per product above, then check out from your cart once you&apos;ve added everything you need.
        </p>
      )}
    </div>
  );
}
