import { motion } from 'framer-motion';
import { Check, Gem, Heart, Droplets, Leaf, Timer, Milk } from 'lucide-react';

const bulletPoints = [
  'Up to 84 nutritious minerals and trace elements',
  'Higher quality NaCl for livestock health',
  'Maintains appetite and healthy weight',
  'Provides essential Magnesium for natural healing',
];

const benefits = [
  {
    title: '84 Trace Minerals',
    description: 'Contains up to 84 essential minerals and trace elements for optimal animal health.',
    icon: Gem,
  },
  {
    title: 'Better Animal Health',
    description: 'Improves overall health, immunity, and vitality in livestock and horses.',
    icon: Heart,
  },
  {
    title: 'Improved Hydration',
    description: 'Encourages proper water intake and electrolyte balance in animals.',
    icon: Droplets,
  },
  {
    title: 'Natural & Unprocessed',
    description: '100% pure, no additives, anti-caking agents, or artificial chemicals.',
    icon: Leaf,
  },
  {
    title: 'Longer Lasting Salt Licks',
    description: 'Dense mineral composition means salt licks last longer than conventional options.',
    icon: Timer,
  },
  {
    title: 'Better Milk Production',
    description: 'Essential minerals support increased and higher quality milk production in dairy cattle.',
    icon: Milk,
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-charcoal to-charcoal-light py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block px-4 py-1.5 bg-himalayan/20 text-himalayan text-sm font-semibold tracking-wider uppercase rounded-full mb-5"
          >
            About Us
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-5 leading-tight"
          >
            World's Best for Livestock
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-white/75 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed"
          >
            Premium Himalayan pink salt trusted by ranchers across America
          </motion.p>
        </div>
      </div>

      {/* Main Content */}
      <section className="py-16 md:py-24 bg-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Image Side */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="relative">
                <div className="rounded-3xl overflow-hidden shadow-2xl shadow-himalayan/10 aspect-[4/3]">
                  <img
                    src="https://himalayankoh.com/wp-content/uploads/2017/10/slat-licking-horse.jpg"
                    alt="Horse licking Himalayan salt"
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/images/placeholder-livestock.svg'; }}
                  />
                </div>
                {/* Floating badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="absolute -bottom-6 -right-4 md:right-8 bg-white rounded-2xl p-5 shadow-xl shadow-black/10"
                >
                  <div className="text-center">
                    <span className="block text-3xl font-bold text-himalayan">84+</span>
                    <span className="text-sm text-charcoal-light font-medium">Trace Minerals</span>
                  </div>
                </motion.div>
                {/* Decorative */}
                <div className="hidden sm:block absolute -top-4 -left-4 w-24 h-24 bg-himalayan/10 rounded-full -z-10" />
                <div className="hidden sm:block absolute -bottom-4 -left-8 w-32 h-32 bg-himalayan/5 rounded-full -z-10" />
              </div>
            </motion.div>

            {/* Text Side */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-charcoal mb-6 leading-tight">
                Premium Himalayan Salt for{' '}
                <span className="text-himalayan">Healthier Livestock</span>
              </h2>
              <div className="space-y-4 text-charcoal-light leading-relaxed text-base md:text-lg">
                <p>
                  Pristine pink Himalayan crystal salt has long been the premium standard for cooking. It's a favorite with top chefs and countless gourmet cooks. But this is an area where livestock can definitely recognize and benefit from a better quality product.
                </p>
                <p>
                  Himalayan pink rock salt has up to 84 nutritious minerals and trace elements. It not only tastes its salty best, but gives cattle, horses, deer, and other animals the higher quality NaCl (Sodium Chloride) they need to stay healthy and be more productive.
                </p>
                <p>
                  Livestock need sodium and chloride to maintain appetite and weight. Pure Himalayan pink salt provides Magnesium necessary for bodies to naturally heal, stay well, and become stronger.
                </p>
              </div>

              <div className="mt-6 space-y-3">
                {bulletPoints.map((point, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="flex-shrink-0 w-6 h-6 bg-himalayan/10 rounded-full flex items-center justify-center">
                      <Check size={14} className="text-himalayan" />
                    </div>
                    <span className="text-charcoal text-sm font-medium">{point}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <span className="inline-block px-4 py-1.5 bg-himalayan-lighter text-himalayan text-sm font-semibold tracking-wider uppercase rounded-full mb-4">
              Why Choose Us
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-charcoal mb-4">
              Benefits of Himalayan Salt
            </h2>
            <p className="text-charcoal-light text-lg max-w-2xl mx-auto">
              Nature's perfect mineral supplement for your livestock
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {benefits.map((benefit, i) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                whileHover={{ y: -6 }}
                className="group bg-white border border-gray-100 rounded-2xl p-7 md:p-8 hover:shadow-xl hover:shadow-himalayan/10 hover:border-himalayan/20 transition-all duration-500"
              >
                <div className="w-14 h-14 bg-himalayan-lighter rounded-2xl flex items-center justify-center text-himalayan mb-5 group-hover:bg-himalayan group-hover:text-white transition-all duration-300">
                  <benefit.icon size={24} />
                </div>
                <h3 className="font-serif text-xl font-bold text-charcoal mb-3">
                  {benefit.title}
                </h3>
                <p className="text-charcoal-light text-sm leading-relaxed">
                  {benefit.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16 md:py-24 bg-charcoal text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-6">
              Our Commitment to Quality
            </h2>
            <p className="text-white/70 text-lg leading-relaxed mb-6">
              At Himalayan Koh, we source our salt directly from the ancient salt mines of the Himalayan mountains. Each product undergoes rigorous quality testing to ensure it meets our premium standards.
            </p>
            <p className="text-white/70 text-lg leading-relaxed">
              Our mission is simple: provide the highest quality Himalayan pink salt to farmers, ranchers, and families across America. We believe that healthier livestock leads to healthier food and a healthier planet.
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
