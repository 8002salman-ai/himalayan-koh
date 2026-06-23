import { motion } from 'framer-motion';
import { MapPin, Phone, Quote, Star, Award } from 'lucide-react';
import { Link } from 'react-router-dom';

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
                  Pristine pink Himalayan crystal salt has long been the premium standard for cooking. It's a favorite with top chefs and countless gourmet cooks. But livestock can also recognize and benefit from a better quality product.
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
                    <p className="text-charcoal-light leading-relaxed mb-5 text-base md:text-lg">"{testimonial.quote}"</p>
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
                  Contact Us
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
        transition={{ delay: 0.2 }}
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
