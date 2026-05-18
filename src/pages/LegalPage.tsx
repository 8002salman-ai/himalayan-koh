import { motion } from 'framer-motion';

interface LegalPageProps {
  type: 'terms' | 'privacy';
}

const content = {
  terms: {
    eyebrow: 'Terms',
    title: 'Terms of Service',
    description: 'Review the terms that apply when using Himalayan Koh services and purchasing products.',
    sections: [
      {
        title: 'Orders and Product Information',
        body: 'Product availability, pricing, and descriptions may change as inventory and supplier information are updated. We work to keep product details accurate and current.',
      },
      {
        title: 'Customer Responsibilities',
        body: 'Customers are responsible for providing accurate account, shipping, and payment details when placing orders or contacting support.',
      },
      {
        title: 'Support',
        body: 'For questions about an order, product, or account, contact Himalayan Koh support using the contact details provided on the site.',
      },
    ],
  },
  privacy: {
    eyebrow: 'Privacy',
    title: 'Privacy Policy',
    description: 'Learn how Himalayan Koh handles customer information used for accounts, orders, and support.',
    sections: [
      {
        title: 'Information We Use',
        body: 'We use customer information to manage accounts, process orders, provide support, and communicate about products or services.',
      },
      {
        title: 'Data Protection',
        body: 'Customer data should be accessed only for legitimate business needs and handled through configured application services.',
      },
      {
        title: 'Contact',
        body: 'Contact Himalayan Koh if you need help with account data, order information, or privacy-related questions.',
      },
    ],
  },
};

export default function LegalPage({ type }: LegalPageProps) {
  const page = content[type];

  return (
    <div className="min-h-screen bg-warm-white">
      <div className="bg-gradient-to-r from-charcoal to-charcoal-light py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block px-4 py-1.5 bg-himalayan/20 text-himalayan text-sm font-semibold tracking-wider uppercase rounded-full mb-4"
          >
            {page.eyebrow}
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4"
          >
            {page.title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-white/70 text-lg max-w-2xl mx-auto"
          >
            {page.description}
          </motion.p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        <div className="bg-white rounded-2xl shadow-md p-6 md:p-8 space-y-8">
          {page.sections.map((section) => (
            <section key={section.title}>
              <h2 className="font-serif text-xl font-bold text-charcoal mb-3">
                {section.title}
              </h2>
              <p className="text-charcoal-light leading-relaxed">
                {section.body}
              </p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
