import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Quote, Star, Award } from 'lucide-react';

const livestockBenefits = [
  'Himalayan pink rock salt has up to 84 nutritious minerals and trace elements for cattle, horses, deer, and other animals.',
  'Livestock need sodium and chloride to maintain appetite, weight, milk production, and healthy growth.',
  'Pure Himalayan pink salt provides natural magnesium and mineral support that helps animals stay stronger and healthier.',
  'Our Himalayan salt licks and lumps are a natural improvement over livestock salts with artificial mineral additives.',
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
                  World's Best for Livestock
                </span>
              </div>
              <h2 className="font-serif text-4xl md:text-5xl font-bold text-charcoal mb-6 leading-tight">
                Rich All Natural Himalayan Pink Salt
              </h2>
              <div className="space-y-5 text-charcoal-light leading-relaxed text-base md:text-lg mb-8">
                <p>
                  Pristine pink Himalayan crystal salt has long been the premium standard for cooking. It's a favorite with top chefs and countless gourmet cooks. But livestock can also recognize and benefit from a better quality product.
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
                src="https://himalayankoh.com/wp-content/uploads/2017/10/slat-licking-horse.jpg"
                alt="Horse licking Himalayan salt"
                className="rounded-2xl shadow-lg object-cover w-full aspect-square"
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).src = '/images/placeholder-livestock.svg'; }}
              />
              <img
                src="https://himalayankoh.com/wp-content/uploads/2017/10/bowl-of-salt.jpg"
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

      {/* Testimonials */}
      <section className="py-16 md:py-24">
        <div className="max-w-[88rem] mx-auto px-4 sm:px-6">
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
                    <p className="text-charcoal-light leading-relaxed mb-5 text-base md:text-lg">"{testimonial.quote}"</p>
                    <p className="font-semibold text-charcoal">{testimonial.author}</p>
                    <p className="text-sm text-charcoal-light">{testimonial.location}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
