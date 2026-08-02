import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    q: 'What makes Himalayan Koh salt different from regular salt?',
    a: 'Our salt is unrefined Himalayan pink salt, naturally rich in 84+ trace minerals. Unlike processed table salt, it contains no additives, anti-caking agents, or added chemicals.',
  },
  {
    q: 'Is your salt safe for both livestock and human consumption?',
    a: 'Yes. Our Himalayan pink salt is natural and unrefined, and is offered in both livestock salt licks/blocks and food-grade edible salt for cooking.',
  },
  {
    q: 'How long does a salt lick or block last?',
    a: 'The lifespan of a salt lick depends on consumption rates, herd size, and weather conditions. Most quality salt licks last several weeks to months with regular use.',
  },
  {
    q: 'Do you offer free shipping?',
    a: 'Yes, we offer free shipping on orders of $50 or more.',
  },
  {
    q: 'How can I track my order?',
    a: 'Once your order ships, you will receive a tracking number by email. You can also check your order status from your account under Orders.',
  },
  {
    q: 'What is your return and replacement policy?',
    a: 'Return requests must be made within 30 days of your order date, and eligible products are replaced (not refunded) once received and inspected. See our full Return & Replacement Policy for details.',
  },
  {
    q: 'Do you offer wholesale or bulk pricing?',
    a: 'Yes, we offer a wholesale program for retail stores, farm & ranch suppliers, veterinary clinics, distributors, and online sellers. Visit our Wholesale Program page or contact us for details.',
  },
  {
    q: 'How do I get in touch with customer support?',
    a: 'You can reach us by email at sales@himalayankoh.com or by phone at (832) 224-6466, or use the contact form on our Contact page.',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-2xl bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <span className="font-semibold text-charcoal">{q}</span>
        <ChevronDown size={18} className={`text-himalayan flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="px-5 pb-4 text-charcoal-light leading-relaxed">{a}</p>}
    </div>
  );
}

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-warm-white">
      <div className="bg-gradient-to-r from-charcoal to-charcoal-light py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block px-4 py-1.5 bg-himalayan/20 text-himalayan text-sm font-semibold tracking-wider uppercase rounded-full mb-5"
          >
            FAQ
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-5 leading-tight"
          >
            Frequently Asked Questions
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-white/75 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed"
          >
            Answers to common questions about our products, shipping, and returns.
          </motion.p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        <div className="space-y-3">
          {faqs.map((item) => (
            <FaqItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>

        <p className="text-center text-charcoal-light text-sm mt-10">
          Still have questions? <Link to="/contact" className="text-himalayan font-semibold hover:underline">Contact us</Link>.
        </p>
      </div>
    </div>
  );
}
