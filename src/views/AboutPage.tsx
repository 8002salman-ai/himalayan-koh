import { motion } from 'framer-motion';
import { Check, Gem, Heart, Droplets, Leaf, Timer, Utensils } from 'lucide-react';
import { legacyImage } from '@/lib/images/legacyAssets';

/**
 * The about page tells the story the business actually has: one rock, one
 * mineral profile, and a shelf of ways to use it. The livestock framing that
 * used to be here went with the products it advertised.
 *
 * Health claims are deliberately soft. "84+ trace minerals" is a statement about
 * the rock, which is true of unrefined salt; nothing here promises a health
 * outcome, because the store sells salt, not a supplement.
 */
const bulletPoints = [
  'Up to 84 minerals and trace elements, as the rock holds them',
  'Unrefined — no anti-caking agents, bleaching or additives',
  'Fine, medium and coarse grain, plus blocks, lamps and bulk bags',
  'Packed to stay dry in jars, resealable pouches and bags',
];

const benefits = [
  {
    title: '84 Trace Minerals',
    description: 'The seam carries up to 84 minerals and trace elements; unrefined salt keeps them.',
    icon: Gem,
  },
  {
    title: 'The Pink Is Iron',
    description: 'Colour and vein vary through the rock. A washed white salt has had that character removed.',
    icon: Heart,
  },
  {
    title: 'Every Grain Size',
    description: 'Fine for baking and brines, medium for the grinder, coarse for finishing and slow cooks.',
    icon: Droplets,
  },
  {
    title: 'Nothing Added',
    description: 'No anti-caking agents, no bleaching, no iodine. Salt, and what the rock already contained.',
    icon: Leaf,
  },
  {
    title: 'Built to Last',
    description: 'Sealed and kept dry, salt does not spoil — a bulk bag is pantry stock, not a race against a date.',
    icon: Timer,
  },
  {
    title: 'Beyond the Kitchen',
    description: 'Blocks and plates for grilling and serving, and lamps and décor carved from the same salt.',
    icon: Utensils,
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
            One Rock, Many Kitchens
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-white/75 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed"
          >
            Unrefined Himalayan pink salt, packed and shipped from our Texas facility
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
                    src={legacyImage('bowlOfSalt')}
                    alt="Coarse unrefined pink Himalayan salt crystals"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/images/placeholder-product.svg'; }}
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
                Premium Himalayan Salt for the{' '}
                <span className="text-himalayan">Kitchen and the Home</span>
              </h2>
              <div className="space-y-4 text-charcoal-light leading-relaxed text-base md:text-lg">
                <p>
                  Himalayan pink salt is rock salt: it was laid down as an ancient sea dried, then
                  pushed up into the mountains and cut out of the seam. Washing it into pure white
                  sodium chloride is what removes the trace minerals and the colour.
                </p>
                <p>
                  We do not wash it. What the rock holds — up to 84 minerals and trace elements, and
                  the iron that makes it pink — is what reaches the jar, and the flavour is why cooks
                  reach for it.
                </p>
                <p>
                  We stock it the way a kitchen and a home actually use it: fine grain for baking and
                  brines, coarse for finishing, blocks for the grill and the table, and lamps and
                  décor cut from the same piece of rock.
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
              What Unrefined Salt Keeps
            </h2>
            <p className="text-charcoal-light text-lg max-w-2xl mx-auto">
              The same rock, in the format each job needs
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
              Where the Salt Comes From
            </h2>
            <p className="text-white/70 text-lg leading-relaxed mb-6">
              Our Himalayan rose pink salt comes from the Khewra salt mine, in the Jhelum
              District of Pakistan. We work only with hand-picked exporters, so the salt that
              reaches us is the salt we asked for, and we check each batch for grain consistency
              before it is packed.
            </p>
            <p className="text-white/70 text-lg leading-relaxed mb-6">
              From there it is packed and shipped from our warehouse in Houston, Texas — jars and
              pouches for the kitchen, blocks for the grill and the table, and bulk bags for
              kitchens and shops that go through salt quickly.
            </p>
            <p className="text-white/70 text-lg leading-relaxed">
              Bulk and wholesale orders are welcome, including orders shipping outside the United
              States. If you are buying in quantity, call us and we will work it out with you.
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
