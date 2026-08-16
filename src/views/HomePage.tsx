import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Star, Award } from 'lucide-react';
import { legacyImage } from '@/lib/images/legacyAssets';
import { products as fallbackProducts, Product } from '@/data/products';
import ProductCard from '@/components/ProductCard';
import { SkeletonProductCard } from '@/components/ui/Skeleton';
import { productsApi } from '@/lib/supabase/api';
import { mapSupabaseProduct } from '@/lib/products/mapProduct';
import { isSupabaseConfigured } from '@/lib/supabase/client';

const livestockBenefits = [
  'Himalayan pink rock salt has up to 84 nutritious minerals and trace elements for cattle, horses, deer, and other animals.',
  'Livestock need sodium and chloride to maintain appetite, weight, milk production, and healthy growth.',
  'Pure Himalayan pink salt provides natural magnesium and mineral support that helps animals stay stronger and healthier.',
  'Our Himalayan salt licks and rock salt are a natural improvement over livestock salts with added mineral supplements.',
];

const healthCards = [
  {
    title: 'Better Livestock Health',
    text: 'Quality sodium and chloride support appetite, body weight, hydration, and daily herd performance.',
  },
  {
    title: 'Milk Production Support',
    text: 'Good salt intake helps mothers maintain the mineral balance needed for stronger milk production.',
  },
  {
    title: 'Magnesium & Nutrition',
    text: 'Natural Himalayan minerals support recovery, strength, and overall wellness for working animals.',
  },
];

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>(() =>
    fallbackProducts.filter((product) => product.isFeatured).slice(0, 4)
  );
  const [featuredLoading, setFeaturedLoading] = useState(isSupabaseConfigured());

  useEffect(() => {
    let active = true;
    if (!isSupabaseConfigured()) {
      setFeaturedLoading(false);
      return;
    }

    productsApi
      .getFeaturedProducts(4)
      .then((rows) => {
        if (active && rows.length > 0) {
          setFeaturedProducts(rows.map(mapSupabaseProduct));
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

      {/* Livestock Salt Story */}
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
                  World&apos;s Best for Livestock
                </span>
              </div>
              {/* h1, not h2: this is the homepage's main heading — the page had
                  no h1 at all, so search engines had no primary topic signal.
                  Styling lives in the className, so the visual size is unchanged. */}
              <h1 className="font-serif text-4xl md:text-5xl font-bold text-charcoal mb-6 leading-tight">
                Rich All Natural Himalayan Pink Salt
              </h1>
              <div className="space-y-5 text-charcoal-light leading-relaxed text-base md:text-lg mb-8">
                <p>
                  Pristine pink Himalayan crystal salt has long been the premium standard for cooking. It&apos;s a favorite with top chefs and countless gourmet cooks. But livestock can also recognize and benefit from a better quality product.
                </p>
                <p>
                  Himalayan pink rock salt not only tastes its salty best, but gives cattle, horses, deer, and other animals the quality NaCl they need to stay healthy and be more productive.
                </p>
                <p>
                  Ensure your herd is healthy and happy. Shop our convenient premium Himalayan Pink Salt products and enjoy friendly customer service from Himalayan Koh.
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
                {livestockBenefits.map((benefit) => (
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
                src={legacyImage('horseLicking')}
                alt="Horse licking Himalayan salt"
                className="rounded-2xl shadow-lg object-cover w-full aspect-square"
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).src = '/images/placeholder-livestock.svg'; }}
              />
              <img
                src={legacyImage('bowlOfSalt')}
                alt="Bowls of Himalayan salt"
                className="rounded-2xl shadow-lg object-cover w-full aspect-square"
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).src = '/images/placeholder-livestock.svg'; }}
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
