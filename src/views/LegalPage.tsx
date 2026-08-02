import { motion } from 'framer-motion';

interface LegalPageProps {
  type: 'terms' | 'privacy' | 'return';
}

interface Subsection {
  heading: string;
  body?: string;
  bullets?: string[];
}

interface Section {
  title: string;
  intro?: string;
  body?: string;
  bullets?: string[];
  subsections?: Subsection[];
  outro?: string;
}

const content: Record<LegalPageProps['type'], { eyebrow: string; title: string; description: string; sections: Section[] }> = {
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
    eyebrow: 'Effective Date: August 2, 2026',
    title: 'Privacy Policy',
    description:
      'At Himalayan Koh, we value your privacy and are committed to protecting your personal information. This Privacy Policy explains what information we collect, how we use it, and the choices you have when using our website.',
    sections: [
      {
        title: 'Information We Collect',
        bullets: [
          'Name',
          'Billing and shipping address',
          'Email address',
          'Phone number',
          'Payment information (processed securely through our payment providers)',
          'Order history',
          'IP address, browser type, and device information',
          'Website usage information through cookies and analytics',
        ],
      },
      {
        title: 'Checkout Options',
        subsections: [
          {
            heading: 'Guest Checkout',
            body: 'You do not need to create an account to make a purchase. Customers may complete their orders using Guest Checkout. We collect only the information necessary to process, ship, and support the order.',
          },
          {
            heading: 'Create an Account',
            bullets: [
              'Customers who prefer to create an account may register during checkout.',
              'View order history.',
              'Save billing and shipping information for faster future purchases.',
              'Track current and past orders.',
              'Manage account information.',
            ],
          },
        ],
        outro:
          'Whether you choose Guest Checkout or create an account, your personal information is collected, stored, and protected in accordance with this Privacy Policy.',
      },
      {
        title: 'How We Use Your Information',
        bullets: [
          'Process and fulfill your orders.',
          'Communicate regarding your order or customer service requests.',
          'Improve our website and customer experience.',
          'Prevent fraud and unauthorized transactions.',
          'Comply with legal obligations.',
          'Send promotional emails if you have opted in (you may unsubscribe at any time).',
        ],
      },
      {
        title: 'Payment Security',
        body: 'Payments are processed securely through trusted third-party payment processors. Himalayan Koh does not store your complete credit or debit card information on our servers.',
      },
      {
        title: 'Cookies',
        body: 'Our website uses cookies to remember your preferences, improve website performance, analyze website traffic, and enhance your shopping experience. You may disable cookies through your browser settings, although some website features may not function properly.',
      },
      {
        title: 'Sharing Your Information',
        bullets: [
          'We do not sell or rent your personal information.',
          'We may share your information only with trusted service providers, including payment processors, shipping carriers, website hosting providers, and analytics services. These providers receive only the information necessary to perform their services.',
        ],
      },
      {
        title: 'Data Security',
        body: 'We use reasonable administrative, technical, and physical safeguards to protect your personal information. While no method of transmission over the Internet is completely secure, we strive to protect your information using industry-standard security practices.',
      },
      {
        title: 'Your Rights',
        body: 'Depending on your location, you may request access to, correction of, or deletion of your personal information where permitted by law, and you may opt out of marketing communications.',
      },
      {
        title: 'Third-Party Links',
        body: 'Our website may contain links to third-party websites. We are not responsible for the privacy practices or content of those websites.',
      },
      {
        title: 'Changes to This Privacy Policy',
        body: 'We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated effective date.',
      },
      {
        title: 'Contact Us',
        intro: 'If you have any questions about this Privacy Policy or how we handle your information, please contact us:',
        bullets: [
          'Email: sales@himalayankoh.com',
          'Phone: (832) 224-6466',
        ],
      },
    ],
  },
  return: {
    eyebrow: 'Returns & Replacements',
    title: 'Return & Replacement Policy',
    description:
      'At Himalayan Koh, we take pride in the quality of our products. If you receive a product that is damaged, defective, or incorrect, please contact us within 30 days of your order date. We will work with you to resolve the issue as quickly as possible.',
    sections: [
      {
        title: 'Return Eligibility',
        bullets: [
          'Return requests must be made within 30 days of the original order date.',
          'Products must be unused, unopened, and returned in their original packaging.',
          'Returns require prior approval from Himalayan Koh before being shipped.',
        ],
      },
      {
        title: 'Replacement Policy',
        bullets: [
          'Once we receive and inspect your returned product, we will process a replacement if the return meets our policy requirements.',
          'Replacement items will be shipped after the returned product has been received and approved.',
        ],
      },
      {
        title: 'No Refund Policy',
        bullets: [
          'We do not offer refunds.',
          'Eligible returned products will be replaced with the same product. Refunds, exchanges for different products, or store credits are not available.',
        ],
      },
      {
        title: 'Return Shipping',
        bullets: [
          'Customers are responsible for purchasing their own return shipping label.',
          'Customers are responsible for properly packaging the product to prevent damage during transit.',
          'Customers are responsible for all return shipping costs.',
          'We recommend using a trackable shipping service, as Himalayan Koh is not responsible for returns that are lost or damaged during shipping.',
        ],
      },
      {
        title: 'Damaged or Incorrect Orders',
        bullets: [
          'If your order arrives damaged or you received the wrong product, please contact us within 30 days of delivery. Include your order number and photos of the product and packaging so we can review your request promptly.',
        ],
      },
      {
        title: 'Contact Us',
        bullets: [
          'If you have any questions regarding returns or replacements, please contact us:',
          'Email: sales@himalayankoh.com',
          'Phone: (832) 224-6466',
        ],
      },
    ],
  },
};

export default function LegalPage({ type }: LegalPageProps) {
  const page = content[type];

  return (
    <div className="min-h-screen bg-warm-white">
      <div className="bg-gradient-to-r from-charcoal to-charcoal-light py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block px-4 py-1.5 bg-himalayan/20 text-himalayan text-sm font-semibold tracking-wider uppercase rounded-full mb-5"
          >
            {page.eyebrow}
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-5 leading-tight"
          >
            {page.title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-white/75 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed"
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
              {section.intro && (
                <p className="text-charcoal-light leading-relaxed mb-3">{section.intro}</p>
              )}
              {section.subsections ? (
                <div className="space-y-4">
                  {section.subsections.map((sub) => (
                    <div key={sub.heading}>
                      <h3 className="font-semibold text-charcoal mb-1.5">{sub.heading}</h3>
                      {sub.bullets ? (
                        <ul className="list-disc list-outside pl-5 space-y-1.5 text-charcoal-light leading-relaxed">
                          {sub.bullets.map((bullet, i) => (
                            <li key={i}>{bullet}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-charcoal-light leading-relaxed">{sub.body}</p>
                      )}
                    </div>
                  ))}
                  {section.outro && (
                    <p className="text-charcoal-light leading-relaxed">{section.outro}</p>
                  )}
                </div>
              ) : section.bullets ? (
                <ul className="list-disc list-outside pl-5 space-y-1.5 text-charcoal-light leading-relaxed">
                  {section.bullets.map((bullet, i) => (
                    <li key={i}>{bullet}</li>
                  ))}
                </ul>
              ) : section.body ? (
                <p className="text-charcoal-light leading-relaxed">
                  {section.body}
                </p>
              ) : null}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
