import Link from 'next/link';
import { motion } from 'framer-motion';

/**
 * The policy pages, carrying the business's own wording.
 *
 * Every statement here comes from the production WordPress policies (see
 * `docs/FRONTEND-CONTENT-AUDIT.md` for the item-by-item mapping). Two things are
 * deliberate:
 *
 * 1. Promises are not invented. Where production is silent — a reply time, weekend
 *    support hours — the page does not promise one. The hours and the refund route
 *    below are production's, not the storefront's earlier guesses.
 * 2. The return page carries production's refund terms. It previously said refunds
 *    were not offered at all, which contradicted the live policies; the owner should
 *    confirm the refund wording is current (flagged in the audit).
 */

const SUPPORT_PHONE = '(201) 401-5104';
const STORE_PHONE = '(832) 224-6466';

interface LegalPageProps {
  type: 'terms' | 'privacy' | 'return' | 'shipping';
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
  link?: { href: string; label: string };
}

const content: Record<LegalPageProps['type'], { eyebrow: string; title: string; description: string; sections: Section[] }> = {
  shipping: {
    eyebrow: 'Shipping & Delivery',
    title: 'Shipping & Delivery',
    description:
      'How Himalayan Koh packs, dispatches and tracks orders, and what to expect once your package leaves our Houston warehouse.',
    sections: [
      {
        title: 'Where We Ship From',
        body: 'Once your order is placed it is packaged in our warehouse in Houston, Texas. Shipping rates are calculated from the total weight and volume of your order as well as the destination. We pack every order carefully and securely so it arrives in good condition.',
      },
      {
        title: 'Dispatch Time',
        body: 'Most orders are packaged and shipped from our warehouse within 1–2 business days, and many go out the same day. The delivery date depends on the distance your package has to travel from our facility. Phone service for website purchases runs Monday through Friday, 8:00 AM to 5:00 PM CST, excluding weekends and holidays.',
      },
      {
        title: 'Carriers and Delivery Options',
        intro: 'We ship all small package orders with United States Postal Service (USPS) and FedEx.',
        bullets: [
          'Standard delivery by USPS or FedEx.',
          'Expedited options for small packages: FedEx Next Day Air, 2 Day Air and 3-Day Select.',
          'We always work the shipping calculation to get you the best available rate.',
        ],
      },
      {
        title: 'Tracking Your Order',
        bullets: [
          'Once your order has shipped you will receive a shipment confirmation email from Himalayan Koh with your USPS and FedEx tracking number.',
          'If you created an account on the website you can log in to your account to check order status and tracking.',
          'Guest checkout orders do not appear in the website account area — keep your confirmation email, or call us and we will look it up.',
        ],
      },
      {
        title: 'Changing an Order After Dispatch',
        body: `Once a package has left our facility and is on its way to you there is very little we can change about the delivery details. If you need to change something, contact us as early as possible — ideally before the order is marked shipped — and we will do whatever the carrier allows. For urgent changes, call ${STORE_PHONE}.`,
      },
      {
        title: 'Bulk, Wholesale and Large Orders',
        body: 'Bulk bags, blocks and wholesale quantities ship differently from single jars and pouches because of the weight involved. Call us to arrange bulk and wholesale orders, including orders shipping outside the United States.',
      },
      {
        title: 'Returns Ship Separately',
        body: 'Shipping charges are not refunded as part of a return unless the product was faulty or damaged on arrival. The conditions are on the return policy:',
        link: { href: '/return', label: 'Return & Refund Policy' },
      },
      {
        title: 'Questions About a Delivery',
        intro: 'If you cannot find your tracking information or have a question about an order in transit:',
        bullets: [
          `Phone: ${STORE_PHONE}`,
          `Returns and order support line: ${SUPPORT_PHONE}`,
          'Email: sales@himalayankoh.com',
          'Mailing address: Himalayan Koh, 12620 FM 1960 W Ste A-4, Houston, TX 77065',
        ],
      },
    ],
  },
  terms: {
    eyebrow: 'Terms',
    title: 'Terms of Service',
    description:
      'The terms that apply when you use this website and buy from Himalayan Koh, including payment, cancellation, shipping and returns.',
    sections: [
      {
        title: 'Payment Options',
        intro: 'We accept the following payment options online:',
        bullets: [
          'Visa',
          'Mastercard',
          'American Express',
          'Discover',
        ],
        outro: `If at any point during your shopping experience you feel uncomfortable entering your card details online, call ${SUPPORT_PHONE} and we will be happy to process the order by phone.`,
      },
      {
        title: 'Orders, Pricing and Availability',
        body: 'Product availability, pricing and descriptions change as inventory and supplier information are updated. We work to keep product details accurate and current. Prices and stock are those held in our store system at the time of purchase.',
      },
      {
        title: 'Cancellations',
        body: `Most orders are shipped the same day or within 8 hours of being placed. Please call ${SUPPORT_PHONE} as soon as possible if you wish to cancel, and we will do our best to accommodate any request that has not yet been processed or shipped.`,
      },
      {
        title: 'Shipping & Delivery',
        body: 'Orders are packed in our Houston, Texas warehouse and typically dispatched within 1–2 business days. Small packages ship by USPS and FedEx, with expedited FedEx options available. Full details are on the shipping page:',
        link: { href: '/shipping', label: 'Shipping & Delivery' },
      },
      {
        title: 'Returns, Replacements and Refunds',
        body: 'Returns are accepted within 30 days of the order date on unopened products in their original packaging, and refunds are issued in the same manner the purchase was made. Custom and bulk salt items are not returnable. The conditions, including the return address, are set out in full here:',
        link: { href: '/return', label: 'Return & Refund Policy' },
      },
      {
        title: 'Custom and Bulk Items',
        bullets: [
          'Salt bags, salt blocks, and Himalayan salt lumps over 20 lb are made and packed to order and are not returnable.',
          'We suggest placing a small order (5 lb or less) first, for sampling, before ordering larger quantities.',
        ],
      },
      {
        title: 'Customer Responsibilities',
        body: 'Customers are responsible for providing accurate account, shipping and payment details when placing orders or contacting support. Please check your order thoroughly on receipt and tell us about any damage or problem within 30 days of the original order date.',
      },
      {
        title: 'Support',
        intro: 'For questions about an order, a product or your account:',
        bullets: [
          `Phone: ${STORE_PHONE}`,
          `Returns and order support line: ${SUPPORT_PHONE}`,
          'Email: sales@himalayankoh.com',
        ],
      },
    ],
  },
  privacy: {
    eyebrow: 'Your Data',
    title: 'Privacy Policy',
    description:
      'What Himalayan Koh collects, why we collect it, how it is protected, and the choices you have over your information.',
    sections: [
      {
        title: 'Information Collection, Use and Sharing',
        body: 'We are the sole owners of the information collected on this site. We only have access to information you voluntarily give us by email or other direct contact. We will not sell or rent this information to anyone, and we will not share it with any third party outside our organisation other than as necessary to fulfil your request — for example, to ship an order. Unless you ask us not to, we may contact you by email in the future about specials, new products or services, or changes to this policy.',
      },
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
        title: 'Registration and Orders',
        body: 'During registration a user is required to give certain information, such as name and email address, which is used to contact you about the products and services on our site that you have expressed interest in. To buy from us you must provide contact information (name and shipping address) and payment information; this is used for billing purposes and to fill your orders. If we have trouble processing an order, we use this information to contact you.',
      },
      {
        title: 'Checkout Options',
        subsections: [
          {
            heading: 'Guest Checkout',
            body: 'You do not need to create an account to make a purchase. Customers may complete their orders using Guest Checkout. We collect only the information necessary to process, ship and support the order.',
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
          'Whether you choose Guest Checkout or create an account, your personal information is collected, stored and protected in accordance with this Privacy Policy.',
      },
      {
        title: 'How We Use Your Information',
        bullets: [
          'Process and fulfil your orders.',
          'Communicate regarding your order or customer service requests.',
          'Improve our website and customer experience.',
          'Prevent fraud and unauthorised transactions.',
          'Comply with legal obligations.',
          'Send promotional emails if you have opted in (you may unsubscribe at any time).',
        ],
      },
      {
        title: 'Payment Security',
        body: 'Payments are processed securely through trusted third-party payment processors. Himalayan Koh does not store your complete credit or debit card information on our servers. Sensitive information submitted through the website is encrypted in transit — you can verify this from the lock icon and the "https" in your browser address bar.',
      },
      {
        title: 'Data Security',
        body: 'We take precautions to protect your information both online and offline. Only employees who need the information to perform a specific job — billing or customer service, for example — are granted access to personally identifiable information, and the systems holding it are kept in a secure environment. No method of transmission over the internet is completely secure, but we protect your information using industry-standard practices.',
      },
      {
        title: 'Your Rights and Control Over Your Information',
        intro: 'You may opt out of any future contact from us at any time, and you can do the following by contacting us using the details below:',
        bullets: [
          'See what data we have about you, if any.',
          'Change or correct any data we have about you.',
          'Have us delete any data we have about you.',
          'Express any concern you have about our use of your data.',
          'Opt out of marketing communications at any time.',
        ],
      },
      {
        title: 'Cookies',
        body: 'We use cookies on this site. A cookie is a piece of data stored on a site visitor\'s hard drive that helps us improve your access to our site and identify repeat visitors — for example, so you do not have to log in a password more than once. Cookies can also help us track and target the interests of our users to enhance the experience on our site. Usage of a cookie is not linked to any personally identifiable information on our site. You may disable cookies in your browser settings, though some parts of the site may then not work properly.',
      },
      {
        title: 'Sharing Your Information',
        bullets: [
          'We do not sell or rent your personal information.',
          'We share information only with service providers needed to run the store — payment processors, shipping carriers, hosting providers and analytics services — and they receive only what is necessary to perform their service.',
        ],
      },
      {
        title: 'Third-Party Links and Services',
        body: 'This website uses third-party services such as payment processing, shipping rate calculation, shipping label creation and email delivery. Those providers handle your data under their own privacy policies. Our website may link to third-party sites; we are not responsible for their privacy practices or content.',
      },
      {
        title: 'Changes to This Policy',
        body: 'We may update this Privacy Policy from time to time. Any changes are posted on this page.',
      },
      {
        title: 'Contact Us',
        intro: 'If you have any questions about this Privacy Policy, or if you feel we are not abiding by it:',
        bullets: [
          `Phone: ${STORE_PHONE}`,
          `Support line: ${SUPPORT_PHONE}`,
          'Email: sales@himalayankoh.com',
          'Mailing address: Himalayan Koh, 12620 FM 1960 W Ste A-4, Houston, TX 77065',
        ],
      },
    ],
  },
  return: {
    eyebrow: 'Returns & Refunds',
    title: 'Return & Refund Policy',
    description:
      'We stand behind our salt. If something is wrong with your order, contact us within 30 days and we will put it right.',
    sections: [
      {
        title: 'Return Window',
        body: 'Please contact us within 30 days of your order date to arrange a return or to discuss a damaged or mistaken order. Returns require prior approval from Himalayan Koh before the product is shipped back.',
      },
      {
        title: 'Return Eligibility',
        bullets: [
          'Returns are accepted only on products that are unopened and still in their original packaging.',
          'Return requests must be made within 30 days of the original order date.',
          'Custom and bulk items are not returnable: salt bags, salt blocks, and Himalayan salt lumps over 20 lb.',
          'Because of that, we suggest placing a small order (5 lb or less) first, for sampling, before ordering larger quantities.',
        ],
      },
      {
        title: 'Refunds',
        bullets: [
          'Refunds are issued in the same manner the purchase was made (credit card, check, and so on).',
          'Free shipping is not included in the refund unless the product was faulty or damaged on arrival.',
          'Processing a return normally takes around 15 days from the time we receive the product.',
        ],
      },
      {
        title: 'Damaged, Faulty or Incorrect Orders',
        body: 'Check your order thoroughly when it arrives. If a product is damaged, faulty, or not what you ordered, contact us within 30 days of the order date with your order number and photos of the product and packaging so we can review it promptly. When the fault is ours, the cost of shipping is on us and we will correct the error with a replacement or a refund.',
      },
      {
        title: 'Return Shipping',
        bullets: [
          'Customers are responsible for purchasing their own return shipping label and for properly packaging the product so it cannot be damaged in transit.',
          'We recommend a trackable service: we cannot be responsible for returns that are lost or damaged on their way back.',
          'Send approved returns to: Himalayan Koh, Attn: Returns, 10909 Jones Rd #425, Houston, TX 77065.',
        ],
      },
      {
        title: 'Start a Return',
        intro: 'Contact us by phone or email to open a return:',
        bullets: [
          `Phone: ${STORE_PHONE}`,
          `Support line: ${SUPPORT_PHONE}`,
          'Email: sales@himalayankoh.com',
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
              {section.link && (
                <Link
                  href={section.link.href}
                  className="mt-3 inline-flex text-sm font-semibold text-himalayan hover:underline"
                >
                  {section.link.label} →
                </Link>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
