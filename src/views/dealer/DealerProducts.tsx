import { useEffect, useState } from 'react';
import { Search, ShoppingCart } from 'lucide-react';
import { dealerApi, dealerUnitPrice } from '../../lib/supabase/api';
import { isSupabaseConfigured } from '../../lib/supabase/client';
import { useCart } from '../../store/cartStore';
import { useToast } from '../../context/ToastContext';
import type { Product } from '../../lib/supabase/database.types';
import { SkeletonProductGrid } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

export default function DealerProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { addItem } = useCart();
  const toast = useToast();

  useEffect(() => {
    const load = async () => {
      if (!isSupabaseConfigured()) {
        setLoading(false);
        return;
      }
      try {
        const catalog = await dealerApi.getDealerCatalog();
        setProducts(catalog);
      } catch (err) {
        console.error('Failed to load dealer catalog:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const handleAddToCart = async (product: Product) => {
    try {
      await addItem({
        id: product.id,
        name: product.name,
        price: dealerUnitPrice(product),
        image: product.thumbnail || product.images?.[0] || '',
      }, product.moq || 1);
      toast.success(`Added ${product.moq > 1 ? `${product.moq} units of ` : ''}${product.name} to cart.`);
    } catch {
      toast.error('Failed to add item to cart.');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Dealer Catalog</h1>
        <p className="text-charcoal-light">Products shown at your dealer pricing</p>
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
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart size={40} />}
          title="No products found"
          description="Dealer products will appear here once available."
          size="compact"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((product) => {
            const dealerPrice = dealerUnitPrice(product);
            return (
              <div key={product.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="aspect-square bg-gray-50">
                  <img
                    src={product.thumbnail || product.images?.[0] || '/images/placeholder-product.svg'}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/images/placeholder-product.svg'; }}
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-charcoal text-sm leading-snug line-clamp-2 mb-2 min-h-10">
                    {product.name}
                  </h3>
                  <div className="mb-1">
                    <span className="text-himalayan font-bold text-lg">${dealerPrice.toFixed(2)}</span>
                    <span className="text-xs text-charcoal-light ml-1.5 uppercase tracking-wide">Dealer Price</span>
                  </div>
                  <p className="text-xs text-charcoal-light mb-3">MOQ: {product.moq} units</p>
                  <button
                    type="button"
                    onClick={() => handleAddToCart(product)}
                    className="w-full flex items-center justify-center gap-2 min-h-11 bg-himalayan hover:bg-himalayan-dark text-white font-semibold text-sm rounded-xl transition-colors"
                  >
                    <ShoppingCart size={16} />
                    Add to Cart
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
