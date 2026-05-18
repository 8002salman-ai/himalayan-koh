import { motion } from 'framer-motion';
import { ArrowRight, Phone, Star, Truck, Shield, Award } from 'lucide-react';
import { Link } from 'react-router-dom';

const heroCards = [
  { title: 'Salt Licks for Horses', icon: '🐴', link: '/products' },
  { title: 'Salt Lumps for Cattle', icon: '🐄', link: '/products' },
  { title: 'Salt for Deer', icon: '🦌', link: '/products' },
  { title: 'Edible Pink Salt', icon: '🧂', link: '/products' },
];

const features = [
  { icon: Star, label: '84+ Minerals' },
  { icon: Truck, label: 'Free Shipping $50+' },
  { icon: Shield, label: '100% Natural' },
  { icon: Award, label: 'Premium Quality' },
];

export default function HomePage() {
  return (
    <div className="min-h-[calc(100vh-140px)] flex flex-col">
      {/* Hero Section - Full Height */}
      <section className="flex-1 relative flex items-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <img
            src="https://himalayankoh.com/wp-content/uploads/2019/08/horses-1300x200.jpg"
            alt="Horses grazing"
            className="w-full h-full object-cover scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-20 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Text */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <span className="inline-block px-4 py-2 bg-himalayan/20 backdrop-blur-sm border border-himalayan/30 rounded-full text-himalayan-light text-sm font-medium tracking-wider uppercase mb-6">
                  Premium Himalayan Salt
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-4"
              >
                Rich All Natural{' '}
                <span className="text-himalayan">Himalayan Pink Salt</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="text-xl sm:text-2xl text-white/80 font-light mb-8 tracking-wide"
              >
                World's Best for Livestock
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.8 }}
                className="flex flex-col sm:flex-row gap-4 mb-10"
              >
                <Link
                  to="/products"
                  className="group flex items-center justify-center gap-2 px-8 py-4 bg-himalayan hover:bg-himalayan-dark text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-himalayan/30 hover:shadow-xl hover:shadow-himalayan/40 hover:-translate-y-0.5"
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
              </motion.div>

              {/* Features Bar */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.0 }}
                className="flex flex-wrap gap-4 md:gap-6"
              >
                {features.map((feat, i) => (
                  <div key={i} className="flex items-center gap-2 text-white/70 text-sm">
                    <feat.icon size={16} className="text-himalayan" />
                    {feat.label}
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right Side - Cards */}
            <motion.div
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="hidden lg:grid grid-cols-2 gap-4"
            >
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
                    className="group block bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-6 cursor-pointer hover:bg-white/20 transition-all duration-300"
                  >
                    <span className="text-4xl mb-3 block">{card.icon}</span>
                    <p className="text-white text-base font-medium leading-snug">{card.title}</p>
                    <div className="flex items-center gap-1 mt-3 text-himalayan text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Shop Now <ArrowRight size={14} />
                    </div>
                  </Link>
                </motion.div>
              ))}
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
                <span className="text-2xl mb-2 block">{card.icon}</span>
                <p className="text-white text-sm font-medium">{card.title}</p>
              </Link>
            ))}
          </motion.div>
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
