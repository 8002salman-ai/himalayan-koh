import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import ProductDetailView from '../components/ProductDetailView';
import ProductCard from '../components/ProductCard';
import JsonLd from '../components/JsonLd';
import { usePageSeo } from '../hooks/usePageSeo';
import { products as fallbackProducts, type Product } from '../data/products';
import { productsApi } from '../lib/supabase/api';
import { isSupabaseConfigured } from '../lib/supabase/client';
import {
  buildProductJsonLd,
  getFallbackProductBySlug,
  mapSupabaseProduct,
} from '../lib/products/mapProduct';

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        if (!isSupabaseConfigured()) {
          const fallback = getFallbackProductBySlug(slug);
          setProduct(fallback || null);
          setRelated(fallbackProducts.filter((p) => p.slug !== slug).slice(0, 3));
          return;
        }

        const data = await productsApi.getProductBySlug(slug);
        if (!data) {
          setProduct(getFallbackProductBySlug(slug) || null);
          setRelated([]);
          return;
        }

        const mapped = mapSupabaseProduct(data);
        setProduct(mapped);

        const relatedData = await productsApi.getRelatedProducts(data.id, data.category_id, 3);
        setRelated(relatedData.map(mapSupabaseProduct));
      } catch (err) {
        console.error('Failed to load product:', err);
        setProduct(getFallbackProductBySlug(slug) || null);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [slug]);

  const seo = useMemo(() => {
    if (!product) return null;
    return {
      title: product.metaTitle || `${product.name} | Himalayan Koh`,
      description:
        product.metaDescription ||
        product.description ||
        `Shop ${product.name} — premium Himalayan pink salt from Himalayan Koh.`,
      canonicalPath: `/products/${product.slug}`,
      ogImage: product.image,
      ogType: 'product',
    };
  }, [product]);

  usePageSeo(seo);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-warm-white">
        <Loader2 size={40} className="animate-spin text-himalayan" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-warm-white py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="bg-white rounded-2xl shadow-md p-12">
            <h1 className="font-serif text-3xl font-bold text-charcoal mb-3">Product Not Found</h1>
            <p className="text-charcoal-light mb-6">
              This product may have been removed or the link is incorrect.
            </p>
            <Link
              to="/products"
              className="inline-flex items-center justify-center px-6 py-3 bg-himalayan hover:bg-himalayan-dark text-white font-semibold rounded-xl transition-colors"
            >
              Browse All Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-white py-8 md:py-12">
      <JsonLd id="product" data={buildProductJsonLd(product)} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <ProductDetailView product={product} variant="page" />

        {related.length > 0 && (
          <section className="mt-14">
            <h2 className="font-serif text-2xl font-bold text-charcoal mb-6">Related Products</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((item, index) => (
                <ProductCard key={item.id} product={item} index={index} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
