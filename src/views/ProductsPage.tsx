import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Loader2, Search } from 'lucide-react';
import { SkeletonProductGrid } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { products as fallbackProducts, Product } from '../data/products';
import ProductCard from '../components/ProductCard';
import ProductModal from '../components/ProductModal';
import CategoryEducationPanel from '../components/category/CategoryEducationPanel';
import CategoryFilterNav from '../components/category/CategoryFilterNav';
import CategoryHubLayout from '../components/category/CategoryHubLayout';
import CategoryShopPanel from '../components/category/CategoryShopPanel';
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

  const productList = (
    <>
      {loading ? (
        <SkeletonProductGrid count={isCategoryHub ? 3 : 6} />
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          icon={<Search size={40} />}
          title="No products match this filter"
          description="Try another category or clear your search."
          size="compact"
          className="border border-dashed border-gray-200 shadow-none"
        />
      ) : (
        <div
          className={
            isCategoryHub
              ? 'grid grid-cols-1 gap-4'
              : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8'
          }
        >
          {filteredProducts.map((product, i) => (
            <ProductCard
              key={product.id}
              product={product}
              index={i}
              onQuickView={setQuickViewProduct}
              shopHighlight={isCategoryHub}
            />
          ))}
        </div>
      )}
    </>
  );

  const shopColumn = isCategoryHub && categoryContent ? (
    <CategoryShopPanel
      categoryLabel={activeFilter}
      productCount={filteredProducts.length}
    >
      {hubContentLoading && (
        <div className="flex items-center gap-2 text-xs text-charcoal-light">
          <Loader2 size={14} className="animate-spin text-himalayan" />
          Updating…
        </div>
      )}
      {productList}
    </CategoryShopPanel>
  ) : (
    productList
  );

  return (
    <div className="min-h-screen bg-warm-white">
      <div
        className={
          isCategoryHub
            ? 'bg-charcoal py-10 md:py-12 border-b border-white/10'
            : 'bg-gradient-to-r from-charcoal to-charcoal-light py-16 md:py-20'
        }
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          {isCategoryHub && categoryContent ? (
            <>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-himalayan mb-2">
                {categoryContent.hero.eyebrow}
              </p>
              <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                {categoryContent.hero.title}
              </h1>
            </>
          ) : (
            <>
              <span className="inline-block px-4 py-1.5 bg-himalayan/20 text-himalayan text-sm font-semibold tracking-wider uppercase rounded-full mb-4">
                Shop Now
              </span>
              <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
                Premium Salt Products
              </h1>
              <p className="text-white/70 text-lg max-w-2xl mx-auto">
                Handpicked from the heart of the Himalayas — pure, natural, and mineral-rich
              </p>
            </>
          )}
        </div>
      </div>

      <div
        className={`mx-auto px-4 sm:px-6 py-10 md:py-12 ${
          isCategoryHub ? 'max-w-[100rem]' : 'max-w-7xl'
        }`}
      >
        <div className="mb-8">
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
            products={shopColumn}
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
          productList
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
