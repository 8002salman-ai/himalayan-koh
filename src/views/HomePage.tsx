import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Star, Award } from 'lucide-react';
import { legacyImage } from '@/lib/images/legacyAssets';
import { storefrontProducts, Product } from '@/data/products';
import ProductCard from '@/components/ProductCard';
import { SkeletonProductCard } from '@/components/ui/Skeleton';
import { getFeaturedCatalogProducts, isSupabaseDataSource } from '@/lib/backend';
import { isSupabaseConfigured } from '@/lib/supabase/client';

/** Module scope so it stays out of the effect's dependency array. */
const USES_SUPABASE_SOURCE = isSupabaseDataSource();

/**
 * The storefront's opening pitch.
 *
 * Every claim here is about the salt itself — where it comes from and how it is
 * used — because the shop sells pink salt and nothing else. What is actually for
 * sale, at what price and in what stock, is read from the catalog below and
 * never stated in this copy.
 */
const saltBenefits = [
  'Unrefined rock salt, mined from the Himalayan range and packed without anti-caking agents or bleaching.',
  'The pink colour is iron the rock already held — a sign the salt was not washed into pure white sodium chloride.',
  'Fine, medium and coarse grains for baking, brining, grinders and finishing.',
  'Blocks, lamps and bulk bags from the same seam, for cooking, the table and the home.',
];

const healthCards = [
  {
    title: 'Unrefined by Design',
    text: 'Nothing is added and nothing is stripped out. What the rock contained is what reaches the kitchen.',
  },
  {
    title: 'Grain for the Job',
    text: 'Fine dissolves into baking and brines, medium fills a grinder, coarse finishes a plate and seasons a block.',
  },
  {
    title: 'Packed to Stay Dry',
    text: 'Resealable pouches, jars and bags — salt keeps indefinitely as long as it is sealed and away from steam.',
  },
];

export default function HomePage() {
  // The bundled catalog is scoped to the storefront niche, so the first paint
  // before the source answers cannot show a product the store does not sell.
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>(() =>
    storefrontProducts.filter((product) => product.isFeatured).slice(0, 4)
  );
  const [featuredLoading, setFeaturedLoading] = useState(isSupabaseConfigured());

  useEffect(() => {
    let active = true;
    if (USES_SUPABASE_SOURCE && !isSupabaseConfigured()) {
      setFeaturedLoading(false);
      return;
    }

    getFeaturedCatalogProducts(4)
      .then((rows) => {
        // Keep the bundled demo entries on screen unless the source actually
        // returned something — including on the WooCommerce source, where the
        // seeded demo list is the correct empty-state for now.
        if (active && rows.length > 0) {
          setFeaturedProducts(rows);
        }
      })
      .catch((error) => {
        console.error('Failed to load featured products:', error);
      })
      .finally(() => {
        if (active) setFeaturedLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-[calc(100vh-140px)] flex flex-col bg-warm-white">

      {/* Pink Salt Story */}
      <section className="py-16 md:py-28 bg-white">
        <div className="max-w-[88rem] mx-auto px-4 sm:px-8 lg:px-6">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex justify-center mb-6">
                <span className="inline-block px-5 py-1.5 bg-himalayan-lighter text-himalayan text-sm font-semibold tracking-wider uppercase rounded-full text-center">
                  Pure Himalayan Pink Salt
                </span>
              </div>
              {/* h1, not h2: this is the homepage's main heading — the page had
                  no h1 at all, so search engines had no primary topic signal.
                  Styling lives in the className, so the visual size is unchanged. */}
              <h1 className="font-serif text-4xl md:text-5xl font-bold text-charcoal mb-6 leading-tight">
                Unrefined Himalayan Pink Salt
              </h1>
              <div className="space-y-5 text-charcoal-light leading-relaxed text-base md:text-lg mb-8">
                <p>
                  Pink Himalayan crystal salt has long been the standard for cooking — a natural rock salt that keeps the trace minerals and iron the seam gave it instead of being washed into pure white sodium chloride.
                </p>
                <p>
                  We carry it the way a kitchen actually uses it: fine grain for baking and brines, coarse for the grinder and for finishing, thick blocks for the grill and the table, and lamps and décor carved from the same rock.
                </p>
                <p>
                  Shop the salt, read how to use it, or ask us about bulk and wholesale orders.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4 mb-8">
                <Link to="/products" className="btn-hk-primary">
                  Shop Now
                  <ArrowRight size={16} className="ml-2" />
                </Link>
                <Link to="/about" className="btn-hk-ghost">
                  Learn More
                </Link>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {saltBenefits.map((benefit) => (
                  <div key={benefit} className="p-4 bg-warm-white rounded-2xl text-sm text-charcoal-light border border-himalayan/10">
                    <Star size={16} className="text-himalayan mb-2.5" />
                    <p className="leading-relaxed">{benefit}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="grid grid-cols-2 gap-5"
            >
              <img
                src={legacyImage('pinkSaltJar16oz')}
                alt="Jar of unrefined pink Himalayan cooking salt"
                className="rounded-2xl shadow-lg object-cover w-full aspect-square"
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).src = '/images/placeholder-product.svg'; }}
              />
              <img
                src={legacyImage('bowlOfSalt')}
                alt="Bowl of coarse unrefined pink salt crystals"
                className="rounded-2xl shadow-lg object-cover w-full aspect-square"
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).src = '/images/placeholder-product.svg'; }}
              />
            </motion.div>
          </div>

          <div className="mt-14 grid md:grid-cols-3 gap-6">
            {healthCards.map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="relative overflow-hidden rounded-2xl bg-charcoal p-7 text-white shadow-lg"
              >
                <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-himalayan/20" />
                <div className="relative">
                  <div className="w-11 h-11 rounded-xl bg-himalayan text-white flex items-center justify-center mb-5">
                    <Award size={20} />
                  </div>
                  <h3 className="font-serif text-2xl font-bold mb-3 text-white">{card.title}</h3>
                  <p className="text-white/85 leading-relaxed">{card.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products — real catalog data (Supabase), bundled fallback in demo mode. */}
      <section className="py-16 md:py-20 bg-warm-white border-t border-himalayan-line/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-himalayan mb-2">Best Sellers</p>
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-charcoal">
                Featured Salt Products
              </h2>
            </div>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-himalayan hover:text-himalayan-dark transition-colors"
            >
              View all products
              <ArrowRight size={16} />
            </Link>
          </div>

          {featuredLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
              {Array.from({ length: 4 }).map((_, index) => (
                <SkeletonProductCard key={index} />
              ))}
            </div>
          ) : featuredProducts.length === 0 ? null : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
              {featuredProducts.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
