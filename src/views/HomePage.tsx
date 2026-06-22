import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, MapPin, Phone, Star, Truck, Shield, Award, Quote, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { productsApi } from '../lib/supabase/api';
import { isSupabaseConfigured, supabase } from '../lib/supabase/client';
import type { Product } from '../data/products';
import { products as fallbackProducts } from '../data/products';
import { mapSupabaseProduct } from '../lib/products/mapProduct';
import { productsPathForCategoryTitle } from '../lib/categoryContent';

const heroCards = [
  {
    title: 'Salt Blocks for Deer',
    eyebrow: 'salt lick for deer',
    image: 'https://himalayankoh.com/wp-content/uploads/2021/03/horse-lick-himalayan-salt5-600x450.jpg',
    link: productsPathForCategoryTitle('Salt Blocks for Deer'),
  },
  {
    title: 'Salt Lumps for Cattle',
    eyebrow: 'salt lump for cattle',
    image: 'https://himalayankoh.com/wp-content/uploads/2023/08/S6-600x450.jpg',
    link: productsPathForCategoryTitle('Salt Lumps for Cattle'),
  },
  {
    title: 'Salt Lick for Horses',
    eyebrow: 'salt lick for horse',
    image: 'https://himalayankoh.com/wp-content/uploads/2017/10/slat-licking-horse.jpg',
    link: productsPathForCategoryTitle('Salt Lick for Horses'),
  },
  {
    title: 'Salt for Livestock',
    eyebrow: 'salt for livestock',
    image: 'https://himalayankoh.com/wp-content/uploads/2020/10/1-600x450.jpeg',
    link: productsPathForCategoryTitle('Salt for Livestock'),
  },
];

const features = [
  { icon: Star, label: '84+ Minerals' },
  { icon: Truck, label: 'Free Shipping $50+' },
  { icon: Shield, label: '100% Natural' },
  { icon: Award, label: 'Premium Quality' },
];

const productCategories = [
  {
    title: 'Salt Blocks for Deer',
    subtitle: 'salt lick for deer',
    image: 'https://himalayankoh.com/wp-content/uploads/2021/03/horse-lick-himalayan-salt5-600x450.jpg',
    link: productsPathForCategoryTitle('Salt Blocks for Deer'),
  },
  {
    title: 'Salt Lumps for Cattle',
    subtitle: 'salt lump for cattle',
    image: 'https://himalayankoh.com/wp-content/uploads/2023/08/S6-600x450.jpg',
    link: productsPathForCategoryTitle('Salt Lumps for Cattle'),
  },
  {
    title: 'Salt Lick for Horses',
    subtitle: 'salt lick for horse',
    image: 'https://himalayankoh.com/wp-content/uploads/2017/10/slat-licking-horse.jpg',
    link: productsPathForCategoryTitle('Salt Lick for Horses'),
  },
  {
    title: 'Salt for Livestock',
    subtitle: 'salt for livestock',
    image: 'https://himalayankoh.com/wp-content/uploads/2020/10/1-600x450.jpeg',
    link: productsPathForCategoryTitle('Salt for Livestock'),
  },
];

const livestockBenefits = [
  'Himalayan pink rock salt has up to 84 nutritious minerals and trace elements for cattle, horses, deer, and other animals.',
  'Livestock need sodium and chloride to maintain appetite, weight, milk production, and healthy growth.',
  'Pure Himalayan pink salt provides natural magnesium and mineral support that helps animals stay stronger and healthier.',
  'Our Himalayan salt licks and lumps are a natural improvement over livestock salts with artificial mineral additives.',
];

const mineralHighlights = [
  { value: '84+', label: 'Trace minerals and elements' },
  { value: '100%', label: 'Natural Himalayan rock salt' },
  { value: 'NaCl', label: 'Quality sodium chloride support' },
  { value: 'Mg', label: 'Magnesium nutrition benefits' },
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

const testimonials = [
  {
    quote:
      'Not only are they very knowledgeable about all the advantages of the Himalayan salt, but their products are by far the best salt blocks we’ve purchased for our Deer Ranch.',
    author: 'James A Brenek',
    location: 'Conroe, TX',
  },
  {
    quote:
      'The Sam Houston Equestrian Center began to use Himalayan salt licks with the horses that were prone to chronic colic. After about 2 months the horses had less digestive issues.',
    author: 'Helen Peters',
    location: 'Sam Houston Equestrian Center, Houston, TX',
  },
  {
    quote:
      'I have a herd of 70 horses and I am constantly amazed how they head for those salt feeders after a long day on the trail.',
    author: 'Darolyn Butler',
    location: 'Cypress Trails Equestrian Center, Humble, TX',
  },
];


export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);

  useEffect(() => {
    const loadFeatured = async () => {
      if (!isSupabaseConfigured()) {
        setFeaturedProducts(fallbackProducts.filter((p) => p.inStock).slice(0, 4));
        return;
      }
      try {
        const items = await productsApi.getFeaturedProducts(4);
        setFeaturedProducts(items.map(mapSupabaseProduct));
      } catch (err) {
        console.error('Failed to load featured products:', err);
        setFeaturedProducts(fallbackProducts.slice(0, 4));
      }
    };

    loadFeatured();

    if (!isSupabaseConfigured()) return;

    const channel = supabase
      .channel('home-featured-products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => loadFeatured())
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-[calc(100vh-140px)] flex flex-col bg-warm-white">
      {/* Hero Section - Full Height */}
      <section className="min-h-[92vh] relative flex items-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <img
            src="https://himalayankoh.com/wp-content/uploads/2019/08/horses-1300x200.jpg"
            alt="Horses grazing"
            className="w-full h-full object-cover scale-105"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/35" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/20" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-[88rem] mx-auto px-4 sm:px-6 py-14 md:py-24 w-full">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 xl:gap-16 items-center">
            {/* Left Side - Text */}
            <div>
              <motion.p
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.7 }}
                className="max-w-3xl text-lg text-white/75 leading-relaxed mb-8"
              >
                Pristine pink Himalayan crystal salt is trusted by gourmet cooks and loved by livestock. Give your cattle, horses, deer, and herd the higher quality sodium chloride and mineral support they need to stay healthy and productive.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.8 }}
                className="flex flex-col sm:flex-row flex-wrap gap-4 mb-10"
              >
                <Link
                  to="/products"
                  className="btn-hk-primary group gap-2 hover:-translate-y-0.5 transition-transform"
                >
                  Shop Products
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  to="/about"
                  className="flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white font-semibold rounded-xl border border-white/20 transition-all duration-300 hover:-translate-y-0.5"
                >
                  Learn More
                </Link>
                <a
                  href="tel:8322246466"
                  className="flex items-center justify-center gap-2 px-8 py-4 bg-white text-charcoal hover:bg-himalayan-lighter font-semibold rounded-xl transition-all duration-300 hover:-translate-y-0.5"
                >
                  <Phone size={18} />
                  Call: (832) 224-6466
                </a>
              </motion.div>

              {/* Features Bar */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.0 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl"
              >
                {features.map((feat, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 backdrop-blur-sm px-3 py-3 text-white/80 text-sm">
                    <feat.icon size={16} className="text-himalayan flex-shrink-0" />
                    <span>{feat.label}</span>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right Side - Premium Visual Cards */}
            <motion.div
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="hidden lg:block"
            >
              <div className="relative">
                <div className="absolute -inset-4 rounded-[2rem] bg-himalayan/20 blur-3xl" />
                <div className="relative rounded-[2rem] border border-white/15 bg-white/10 backdrop-blur-md p-4 shadow-2xl">
                  <div className="grid grid-cols-2 gap-4">
                    {heroCards.map((card, i) => (
                      <motion.div
                        key={card.title}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.8 + i * 0.1 }}
                        whileHover={{ y: -8, scale: 1.02 }}
                      >
                        <Link
                          to={card.link}
                          className="group block overflow-hidden rounded-2xl border border-white/10 bg-black/20"
                        >
                          <div className="relative h-40 overflow-hidden">
                            <img
                              src={card.image}
                              alt={card.eyebrow}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                              loading="eager"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 p-4">
                              <p className="text-xs text-himalayan-light uppercase tracking-wider mb-1">{card.eyebrow}</p>
                              <p className="text-white font-semibold leading-snug">{card.title}</p>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-2xl bg-white p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-himalayan-lighter text-himalayan flex items-center justify-center">
                        <Sparkles size={20} />
                      </div>
                      <div>
                        <p className="font-serif text-xl font-bold text-charcoal">84 Trace Minerals</p>
                        <p className="text-sm text-charcoal-light">Natural nutrition for healthier herds</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {mineralHighlights.map((item) => (
                        <div key={item.value} className="rounded-xl bg-warm-white p-3 text-center">
                          <p className="font-bold text-himalayan">{item.value}</p>
                          <p className="text-[11px] leading-tight text-charcoal-light">{item.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Mobile Cards */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.0 }}
            className="mt-10 grid grid-cols-2 gap-3 lg:hidden"
          >
            {heroCards.map((card) => (
              <Link
                key={card.title}
                to={card.link}
                className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-4 hover:bg-white/20 transition-all"
              >
                <img src={card.image} alt={card.eyebrow} className="w-full h-20 object-cover rounded-lg mb-3" loading="lazy" />
                <p className="text-white text-sm font-medium">{card.title}</p>
              </Link>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Product Locator / Categories */}
      <section className="py-16 md:py-24">
        <div className="max-w-[88rem] mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <span className="inline-block px-4 py-1.5 bg-himalayan-lighter text-himalayan text-sm font-semibold tracking-wider uppercase rounded-full mb-4">
              Product Locator
            </span>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-charcoal">
              Rich All Natural Himalayan Pink Salt
            </h2>
            <p className="text-charcoal-light mt-2">World's Best for Livestock</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {productCategories.map((category, index) => (
              <motion.div
                key={category.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-500"
              >
                <Link to={category.link} className="block">
                  <div className="aspect-[4/3] overflow-hidden bg-gray-100">
                    <img
                      src={category.image}
                      alt={category.subtitle}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-5">
                    <p className="text-xs uppercase tracking-wider text-charcoal-light mb-1">{category.subtitle}</p>
                    <h3 className="font-serif text-xl font-bold text-charcoal group-hover:text-himalayan transition-colors">
                      {category.title}
                    </h3>
                    <div className="flex items-center gap-1 text-himalayan font-semibold text-sm mt-4">
                      Shop Products
                      <ArrowRight size={14} />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="mt-10 grid md:grid-cols-4 gap-4">
            {mineralHighlights.map((item, index) => (
              <motion.div
                key={item.value}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.06 }}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center"
              >
                <p className="font-serif text-4xl font-bold text-himalayan">{item.value}</p>
                <p className="text-sm text-charcoal-light mt-2">{item.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {featuredProducts.length > 0 && (
        <section className="py-16 md:py-20 bg-warm-white border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-10">
              <span className="inline-block px-4 py-1.5 bg-himalayan-lighter text-himalayan text-sm font-semibold tracking-wider uppercase rounded-full mb-4">
                Featured Products
              </span>
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-charcoal">Shop Our Favorites</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
            <div className="text-center mt-10">
              <Link to="/products" className="btn-hk-primary inline-flex items-center gap-2">
                View All Products
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Livestock Salt Story */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-[88rem] mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <span className="inline-block px-4 py-1.5 bg-himalayan-lighter text-himalayan text-sm font-semibold tracking-wider uppercase rounded-full mb-4">
                World's Best for Livestock
              </span>
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-charcoal mb-5">
                Rich All Natural Himalayan Pink Salt
              </h2>
              <div className="space-y-4 text-charcoal-light leading-relaxed">
                <p>
                  Pristine pink Himalayan crystal salt has long been the premium standard for cooking. It’s a favorite with top chefs and countless gourmet cooks. But livestock can also recognize and benefit from a better quality product.
                </p>
                <p>
                  Himalayan pink rock salt not only tastes its salty best, but gives cattle, horses, deer, and other animals the quality NaCl they need to stay healthy and be more productive.
                </p>
                <p>
                  Ensure your herd is healthy and happy. Shop our convenient premium Himalayan Pink Salt products and enjoy friendly customer service from Himalayan Koh.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 mt-6">
                {livestockBenefits.map((benefit) => (
                  <div key={benefit} className="p-4 bg-warm-white rounded-xl text-sm text-charcoal-light">
                    <Star size={16} className="text-himalayan mb-2" />
                    {benefit}
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="grid grid-cols-2 gap-4"
            >
              <img
                src="https://himalayankoh.com/wp-content/uploads/2017/10/slat-licking-horse.jpg"
                alt="Horse licking Himalayan salt"
                className="rounded-2xl shadow-lg object-cover w-full h-64 md:h-80"
                loading="lazy"
              />
              <img
                src="https://himalayankoh.com/wp-content/uploads/2017/10/bowl-of-salt.jpg"
                alt="Bowls of Himalayan salt"
                className="rounded-2xl shadow-lg object-cover w-full h-64 md:h-80 mt-10"
                loading="lazy"
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
                  <h3 className="font-serif text-2xl font-bold mb-3">{card.title}</h3>
                  <p className="text-white/70 leading-relaxed">{card.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 md:py-24">
        <div className="max-w-[88rem] mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-8 lg:gap-12 items-start">
            <div className="lg:sticky lg:top-24">
            <span className="inline-block px-4 py-1.5 bg-himalayan-lighter text-himalayan text-sm font-semibold tracking-wider uppercase rounded-full mb-4">
              Testimonials
            </span>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-charcoal">
              Our Customers Say!
            </h2>
              <p className="text-charcoal-light mt-4 leading-relaxed">
                Ranch owners, equestrian centers, and livestock caretakers trust Himalayan Koh for premium pink salt products that animals naturally enjoy.
              </p>
              <img
                src="https://himalayankoh.com/wp-content/uploads/2017/10/blog9.jpg"
                alt="Livestock ranch visual"
                className="hidden lg:block mt-8 rounded-2xl shadow-lg w-full h-72 object-cover"
                loading="lazy"
              />
            </div>

          <div className="grid gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={`${testimonial.author}-${index}`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="bg-white rounded-2xl shadow-md p-6 md:p-8 border border-gray-100"
              >
                <div className="flex gap-5">
                  <Quote size={32} className="text-himalayan flex-shrink-0" />
                  <div>
                    <p className="text-charcoal-light leading-relaxed mb-5 text-base md:text-lg">“{testimonial.quote}”</p>
                    <p className="font-semibold text-charcoal">{testimonial.author}</p>
                    <p className="text-sm text-charcoal-light">{testimonial.location}</p>
                  </div>
                </div>
              </motion.div>
            ))}
            </div>
          </div>
        </div>
      </section>

      {/* Bulk Buying CTA */}
      <section className="py-16 md:py-24 bg-charcoal relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img
            src="https://himalayankoh.com/wp-content/uploads/2020/10/1-600x450.jpeg"
            alt="Bulk Himalayan salt bags"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="absolute inset-0 bg-charcoal/85" />
        <div className="relative max-w-[88rem] mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
            <div>
              <span className="text-himalayan font-semibold tracking-wider uppercase text-sm">
                Call Us for Bulk Buying
              </span>
              <h2 className="font-serif text-3xl md:text-5xl font-bold text-white mt-3 mb-4">
                Have questions? We are here to help.
              </h2>
              <p className="text-white/70 mb-6">
                Dial now for wholesale pricing, livestock salt guidance, product locator help, and friendly customer service.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="tel:8322246466"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-himalayan hover:bg-himalayan-dark text-white font-semibold rounded-xl transition-colors"
                >
                  <Phone size={18} />
                  (832) 224-6466
                </a>
                <Link
                  to="/contact"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-colors border border-white/15"
                >
                  <MapPin size={18} />
                  Product Locator
                </Link>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-3xl p-6 md:p-8 text-white/80 shadow-2xl">
              <p className="flex items-start gap-3 mb-4">
                <MapPin size={18} className="text-himalayan mt-1 flex-shrink-0" />
                12620 FM 1960 W Ste A-4 Houston, TX 77065
              </p>
              <p className="mb-4">sales@himalayankoh.com</p>
              <p className="text-2xl font-bold text-white">(832) 224-6466</p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Strip */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="bg-charcoal py-4"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/70 text-sm text-center sm:text-left">
            Need bulk orders? We offer wholesale pricing for ranches and farms.
          </p>
          <a
            href="tel:8322246466"
            className="flex items-center gap-2 px-5 py-2 bg-himalayan text-white font-semibold rounded-lg hover:bg-himalayan-dark transition-colors text-sm"
          >
            <Phone size={16} />
            (832) 224-6466
          </a>
        </div>
      </motion.div>
    </div>
  );
}
