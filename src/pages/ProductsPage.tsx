import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Search } from 'lucide-react';
import { products as fallbackProducts, Product } from '../data/products';
import ProductCard from '../components/ProductCard';
import ProductModal from '../components/ProductModal';
import { productsApi } from '../lib/supabase/api';
import { isSupabaseConfigured, supabase } from '../lib/supabase/client';
import type { ProductWithCategory } from '../lib/supabase/database.types';

const filterTabs = ['All', 'Edible Cooking Salt', 'Salt Lick for Horses', 'Salt for Cattle'];

export default function ProductsPage() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>(fallbackProducts);
  const [loading, setLoading] = useState(isSupabaseConfigured());

  useEffect(() => {
    const fetchProducts = async () => {
      if (!isSupabaseConfigured()) {
        setProducts(fallbackProducts);
        setLoading(false);
        return;
      }

      try {
        const { products: supabaseProducts } = await productsApi.getProducts();
        setProducts(supabaseProducts.map(mapProduct));
      } catch (err) {
        console.error('Failed to fetch products:', err);
        setProducts(fallbackProducts);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();

    if (!isSupabaseConfigured()) return;

    const channel = supabase
      .channel('shop-products-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => fetchProducts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => fetchProducts())
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory = activeFilter === 'All' || p.category === activeFilter;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeFilter, searchQuery, products]);

  return (
    <div className="min-h-screen bg-warm-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-charcoal to-charcoal-light py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block px-4 py-1.5 bg-himalayan/20 text-himalayan text-sm font-semibold tracking-wider uppercase rounded-full mb-4"
          >
            Shop Now
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4"
          >
            Premium Salt Products
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-white/70 text-lg max-w-2xl mx-auto"
          >
            Handpicked from the heart of the Himalayas — pure, natural, and mineral-rich
          </motion.p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        {/* Filters & Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-10"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Tabs */}
            <div className="flex flex-wrap justify-center gap-2">
              {filterTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveFilter(tab)}
                  className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                    activeFilter === tab
                      ? 'bg-himalayan text-white shadow-lg shadow-himalayan/25'
                      : 'bg-white text-charcoal hover:bg-himalayan-lighter border border-gray-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            {/* Search */}
            <div className="relative w-full md:w-72">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan transition-all"
              />
            </div>
          </div>
        </motion.div>

        {/* Product Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={40} className="animate-spin text-himalayan" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {filteredProducts.map((product, i) => (
              <ProductCard
                key={product.id}
                product={product}
                index={i}
                onQuickView={setQuickViewProduct}
              />
            ))}
          </div>
        )}

        {!loading && filteredProducts.length === 0 && (
          <div className="text-center py-16 text-charcoal-light">
            <p className="text-lg">No products found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Quick View Modal */}
      {quickViewProduct && (
        <ProductModal
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
        />
      )}
    </div>
  );
}

function mapProduct(product: ProductWithCategory): Product {
  return {
    id: product.id,
    name: product.name,
    price: product.compare_at_price
      ? `$${product.price.toFixed(2)} - $${product.compare_at_price.toFixed(2)}`
      : `$${product.price.toFixed(2)}`,
    priceRange: Boolean(product.compare_at_price),
    priceMin: product.price,
    priceMax: product.compare_at_price || undefined,
    image: product.thumbnail || product.images?.[0] || '',
    category: product.category?.name || 'Uncategorized',
    description: product.description || product.short_description || undefined,
    grainSizes: product.grain_sizes,
    inStock: product.inventory ? product.inventory.quantity > product.inventory.reserved_quantity : true,
  };
}
