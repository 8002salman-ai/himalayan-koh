import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { GraduationCap, Loader2, Search, ShoppingBag } from 'lucide-react';
import { products as fallbackProducts, Product } from '../data/products';
import ProductCard from '../components/ProductCard';
import ProductModal from '../components/ProductModal';
import CategoryEducationPanel from '../components/category/CategoryEducationPanel';
import CategoryFilterNav from '../components/category/CategoryFilterNav';
import CategoryHubLayout from '../components/category/CategoryHubLayout';
import {
  buildProductsCategoryPath,
  productMatchesCategoryFilter,
} from '../lib/categoryContent';
import { productsApi } from '../lib/supabase/api';
import { isSupabaseConfigured, supabase } from '../lib/supabase/client';
import { mapSupabaseProduct } from '../lib/products/mapProduct';
import { usePageSeo } from '../hooks/usePageSeo';
import { useCategoryBlogArticles } from '../hooks/useCategoryBlogArticles';
import { useCategoryHubContent } from '../hooks/useCategoryHubContent';
import { useProductsCategoryFilter } from '../hooks/useProductsCategoryFilter';

const DEFAULT_SEO = {
  title: 'Premium Salt Products | Himalayan Koh',
  description:
    'Shop Himalayan pink cooking salt, horse salt licks, cattle mineral salt, and wildlife blocks. Pure, natural, mineral-rich salt from the Himalayas.',
};

export default function ProductsPage() {
  const { activeFilter, categoryKey } = useProductsCategoryFilter();
  const [searchQuery, setSearchQuery] = useState('');
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>(fallbackProducts);
  const [loading, setLoading] = useState(isSupabaseConfigured());
  const prevCategoryKey = useRef<string | null>(null);

  const { content: categoryContent, loading: hubContentLoading } = useCategoryHubContent(categoryKey);

  const isCategoryHub = Boolean(categoryKey && categoryContent);

  const placeholderArticles = useMemo(
    () => categoryContent?.articles ?? [],
    [categoryContent]
  );

  const { articles: categoryArticles, loading: articlesLoading, source: articlesSource } =
    useCategoryBlogArticles(categoryKey, placeholderArticles);

  usePageSeo(
    useMemo(
      () => (categoryContent
        ? {
            title: categoryContent.seo.title,
            description: categoryContent.seo.description,
            canonicalPath: buildProductsCategoryPath(categoryKey),
          }
        : { ...DEFAULT_SEO, canonicalPath: '/products' }),
      [categoryContent, categoryKey]
    )
  );

  useEffect(() => {
    if (prevCategoryKey.current !== null && prevCategoryKey.current !== categoryKey) {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
    prevCategoryKey.current = categoryKey;
  }, [categoryKey]);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!isSupabaseConfigured()) {
        setProducts(fallbackProducts);
        setLoading(false);
        return;
      }

      try {
        const { products: supabaseProducts } = await productsApi.getProducts();
        setProducts(supabaseProducts.map(mapSupabaseProduct));
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
      const matchesCategory = productMatchesCategoryFilter(p.category, categoryKey, activeFilter);
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeFilter, categoryKey, searchQuery, products]);

  const productGrid = (
    <>
      {hubContentLoading && isCategoryHub && (
        <div className="flex items-center gap-2 text-sm text-charcoal-light">
          <Loader2 size={16} className="animate-spin text-himalayan" />
          Syncing category content…
        </div>
      )}

      {isCategoryHub && (
        <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
          <ShoppingBag size={20} className="text-himalayan shrink-0 mt-0.5" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-charcoal">
              {filteredProducts.length} product{filteredProducts.length === 1 ? '' : 's'} in {activeFilter}
            </p>
            <p className="text-xs text-charcoal-light mt-0.5">
              Mineral-rich salt for this category — add to cart as usual. Guides and downloads are on the right.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={40} className="animate-spin text-himalayan" />
        </div>
      ) : (
        <div
          className={
            isCategoryHub
              ? 'grid grid-cols-1 gap-5'
              : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8'
          }
        >
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
        <div className="text-center py-16 text-charcoal-light rounded-2xl border border-dashed border-gray-200 bg-white">
          <p className="text-lg font-medium text-charcoal">No products in this filter</p>
          <p className="text-sm mt-2 max-w-md mx-auto">
            {isCategoryHub
              ? 'Educational guides, gallery, and PDFs for this category are in the learning panel. Try another filter or search.'
              : 'No products found matching your criteria.'}
          </p>
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-warm-white">
      <div
        className={
          isCategoryHub
            ? 'bg-gradient-to-br from-charcoal via-charcoal-light to-charcoal py-14 md:py-20'
            : 'bg-gradient-to-r from-charcoal to-charcoal-light py-16 md:py-20'
        }
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-block px-4 py-1.5 bg-himalayan/20 text-himalayan text-sm font-semibold tracking-wider uppercase rounded-full mb-4">
            {categoryContent?.hero.eyebrow ?? 'Shop Now'}
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            {categoryContent?.hero.title ?? 'Premium Salt Products'}
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            {categoryContent?.hero.subtitle
              ?? 'Handpicked from the heart of the Himalayas — pure, natural, and mineral-rich'}
          </p>
          {isCategoryHub && (
            <p className="mt-5 inline-flex items-center gap-2 text-sm text-white/80 bg-white/10 px-4 py-2 rounded-full">
              <GraduationCap size={16} className="text-himalayan-lighter" aria-hidden />
              Products on the left · photos, articles & guides on the right
            </p>
          )}
        </div>
      </div>

      <div
        className={`mx-auto px-4 sm:px-6 py-12 ${
          isCategoryHub ? 'max-w-[100rem]' : 'max-w-7xl'
        }`}
      >
        <div className="mb-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <CategoryFilterNav activeFilter={activeFilter} />
            <div className="relative w-full md:w-72">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan transition-all"
              />
            </div>
          </div>
        </div>

        {isCategoryHub && categoryContent ? (
          <CategoryHubLayout
            categoryKey={categoryKey}
            products={productGrid}
            education={
              <AnimatePresence mode="wait">
                <CategoryEducationPanel
                  content={categoryContent}
                  articles={categoryArticles}
                  articlesLoading={articlesLoading}
                  articlesSource={articlesSource}
                />
              </AnimatePresence>
            }
          />
        ) : (
          productGrid
        )}
      </div>

      {quickViewProduct && (
        <ProductModal
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
        />
      )}
    </div>
  );
}
