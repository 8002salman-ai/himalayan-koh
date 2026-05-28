import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import ProductDetailView from '../components/ProductDetailView';
import ProductCard from '../components/ProductCard';
import JsonLd from '../components/JsonLd';
import { usePageSeo } from '../hooks/usePageSeo';
import type { Product } from '../data/products';
import { DEFAULT_DESCRIPTION } from '../lib/seo/constants';
import { buildProductStructuredData } from '../lib/products/productSchema';
import { buildProductPageSeo } from '../lib/products/productSeo';
import { normalizeProductSlug } from '../lib/products/slug';
import { resolveProductBySlug } from '../lib/products/resolveProduct';
import ProductDetailSections from '../components/product/ProductDetailSections';
import ProductLifestyleGallery from '../components/product/ProductLifestyleGallery';
import PdpEmptyState from '../components/product/PdpEmptyState';
import ProductPdpEnrichedSections, {
  pdpHidesDetailFaqs,
} from '../components/product/ProductPdpEnrichedSections';
import { getPdpContent } from '../lib/products/pdpContent';
import { getProductDisplayName } from '../lib/products/productSeo';

export default function ProductDetailPage() {
  const { slug: routeSlug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!routeSlug) {
      setProduct(null);
      setRelated([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const result = await resolveProductBySlug(routeSlug);
      if (cancelled) return;

      setProduct(result.product);
      setRelated(result.related);
      setLoading(false);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [routeSlug]);

  const seo = useMemo(() => {
    const slug = product?.slug ?? (routeSlug ? normalizeProductSlug(routeSlug) : '');
    if (!slug) return null;

    const canonicalPath = `/products/${slug}`;

    if (product) {
      const { title, description } = buildProductPageSeo(product);
      return {
        title,
        description,
        canonicalPath,
        ogImage: product.image,
        ogType: 'product',
      };
    }

    return {
      title: 'Product | Himalayan Koh',
      description: DEFAULT_DESCRIPTION,
      canonicalPath,
      ogType: 'product',
    };
  }, [product, routeSlug]);

  usePageSeo(seo);

  const pdpContent = useMemo(
    () => (product ? getPdpContent(product) : null),
    [product]
  );

  const showGalleryColumn =
    pdpContent?.availability.gallery || Boolean(pdpContent?.emptyStates.gallery);

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
            {process.env.NODE_ENV === 'development' && routeSlug && (
              <p className="text-xs text-charcoal-light/80 mb-4 font-mono">
                slug param: {routeSlug}
              </p>
            )}
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
      <JsonLd id="product" data={buildProductStructuredData(product)} />

      <div
        className={
          showGalleryColumn ? 'max-w-7xl mx-auto px-4 sm:px-6' : 'max-w-5xl mx-auto px-4 sm:px-6'
        }
      >
        <div
          className={
            showGalleryColumn
              ? 'flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-8 lg:items-start'
              : undefined
          }
        >
          <ProductDetailView product={product} variant="page" />
          {pdpContent && showGalleryColumn && (
            pdpContent.availability.gallery ? (
              <ProductLifestyleGallery
                images={pdpContent.gallery}
                productName={getProductDisplayName(product)}
              />
            ) : (
              <aside className="w-full lg:w-auto" aria-label="Lifestyle gallery">
                <PdpEmptyState
                  title="In the field"
                  message={pdpContent.emptyStates.gallery!}
                  compact
                />
              </aside>
            )
          )}
        </div>

        {pdpContent && <ProductPdpEnrichedSections content={pdpContent} />}

        <ProductDetailSections
          product={product}
          hideFaqSection={pdpContent ? pdpHidesDetailFaqs(pdpContent) : false}
        />

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
