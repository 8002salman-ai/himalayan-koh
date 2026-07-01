import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Award,
  Boxes,
  ChevronDown,
  HandCoins,
  Headset,
  Percent,
  Store,
  Stethoscope,
  Tractor,
  Truck,
  Users,
  Warehouse,
} from 'lucide-react';
import { useState } from 'react';

const whyPartner = [
  {
    icon: Percent,
    title: 'Tiered Dealer Pricing',
    text: 'Bronze through Platinum discount tiers that grow with your purchase volume.',
  },
  {
    icon: Truck,
    title: 'Reliable Bulk Supply',
    text: 'Consistent, quality-tested Himalayan pink salt with dependable lead times.',
  },
  {
    icon: Headset,
    title: 'Dedicated Support',
    text: 'A direct line to our team for orders, reorders, and account questions.',
  },
  {
    icon: HandCoins,
    title: 'Flexible Terms',
    text: 'Credit terms and account structures designed for growing dealer partners.',
  },
];

const whoCanApply = [
  { icon: Store, label: 'Retail & Feed Stores' },
  { icon: Warehouse, label: 'Distributors & Wholesalers' },
  { icon: Tractor, label: 'Farm & Ranch Suppliers' },
  { icon: Stethoscope, label: 'Veterinary Clinics' },
  { icon: Boxes, label: 'Online & Marketplace Sellers' },
  { icon: Users, label: 'Co-ops & Buying Groups' },
];

const howItWorks = [
  { step: '1', title: 'Apply', text: 'Submit your business details and required documents online.' },
  { step: '2', title: 'Review', text: 'Our team verifies your business and reseller documentation.' },
  { step: '3', title: 'Approval', text: 'Get approved and assigned a dealer level and account terms.' },
  { step: '4', title: 'Start Ordering', text: 'Sign in to your dealer portal and place orders at dealer pricing.' },
];

const faqs = [
  {
    q: 'Who is eligible to become a Himalayan Koh dealer?',
    a: 'Retail stores, farm & ranch suppliers, veterinary clinics, distributors, and online sellers with a valid business license are welcome to apply.',
  },
  {
    q: 'What documents do I need to apply?',
    a: 'A reseller permit, business license, and tax certificate. Additional supporting documents can be uploaded if helpful.',
  },
  {
    q: 'How long does approval take?',
    a: 'Most applications are reviewed within a few business days. We may reach out if we need more information.',
  },
  {
    q: 'Is there a minimum order quantity?',
    a: 'Yes — minimum order quantities vary by product and are shown in your dealer portal once approved.',
  },
  {
    q: 'Do dealer discounts increase over time?',
    a: 'Yes. Dealers move through Bronze, Silver, Gold, and Platinum tiers as purchase volume grows, unlocking better pricing.',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-himalayan-line rounded-2xl bg-white overflow-hidden">
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

export default function DealerLandingPage() {
  return (
    <div className="min-h-screen bg-warm-white">
      {/* Header */}
      <div className="bg-cream border-b border-himalayan-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 md:h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.svg" alt="Himalayan Koh" className="h-10 md:h-12 w-auto" />
          </Link>
          <Link to="/dealer/login" className="btn-hk-ghost !min-h-[44px] !px-4 !py-2 !text-xs">
            Dealer Login
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-r from-charcoal to-charcoal-light py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block px-5 py-1.5 bg-himalayan/20 text-himalayan text-sm font-semibold tracking-wider uppercase rounded-full mb-5"
          >
            Dealer Program
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-5 leading-tight"
          >
            Become an Authorized Himalayan Koh Dealer
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-white/75 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-8"
          >
            Partner with us for tiered wholesale pricing, reliable bulk supply, and dedicated dealer support.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row justify-center gap-4"
          >
            <Link to="/dealer/register" className="btn-hk-primary">
              Apply Now
              <ArrowRight size={16} className="ml-2" />
            </Link>
            <Link to="/dealer/login" className="btn-hk-ghost !bg-white/10 !text-white !border-white/20">
              Dealer Login
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Why Partner With Us */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 bg-himalayan-lighter text-himalayan text-sm font-semibold tracking-wider uppercase rounded-full mb-4">
              Why Partner With Us
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-charcoal">
              Built for Growing Dealer Partners
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {whyPartner.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 bg-himalayan-lighter rounded-xl flex items-center justify-center text-himalayan mb-4">
                  <item.icon size={22} />
                </div>
                <h3 className="font-serif text-lg font-bold text-charcoal mb-2">{item.title}</h3>
                <p className="text-charcoal-light text-sm leading-relaxed">{item.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Who Can Apply */}
      <section className="py-16 md:py-24 bg-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 bg-himalayan-lighter text-himalayan text-sm font-semibold tracking-wider uppercase rounded-full mb-4">
              Who Can Apply
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-charcoal">
              A Fit For Every Type Of Reseller
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {whoCanApply.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 bg-white rounded-xl p-4 border border-himalayan/10"
              >
                <div className="w-10 h-10 bg-himalayan-lighter rounded-lg flex items-center justify-center text-himalayan flex-shrink-0">
                  <item.icon size={18} />
                </div>
                <span className="text-sm font-medium text-charcoal">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dealer Benefits (Tiers) */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 bg-himalayan-lighter text-himalayan text-sm font-semibold tracking-wider uppercase rounded-full mb-4">
              Dealer Benefits
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-charcoal">
              Tiers That Grow With Your Business
            </h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {['Bronze', 'Silver', 'Gold', 'Platinum'].map((tier, i) => (
              <motion.div
                key={tier}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="relative overflow-hidden rounded-2xl bg-charcoal p-6 text-white shadow-lg text-center"
              >
                <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-himalayan/20" />
                <div className="relative">
                  <Award size={24} className="text-himalayan mx-auto mb-3" />
                  <h3 className="font-serif text-xl font-bold text-white">{tier}</h3>
                  <p className="text-white/70 text-xs mt-1">Dealer Tier</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24 bg-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 bg-himalayan-lighter text-himalayan text-sm font-semibold tracking-wider uppercase rounded-full mb-4">
              How It Works
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-charcoal">Four Simple Steps</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {howItWorks.map((item) => (
              <div key={item.step} className="bg-white rounded-2xl p-6 border border-gray-100 text-center">
                <div className="w-10 h-10 rounded-full bg-himalayan text-white font-serif font-bold flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-serif text-lg font-bold text-charcoal mb-2">{item.title}</h3>
                <p className="text-charcoal-light text-sm leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 bg-himalayan-lighter text-himalayan text-sm font-semibold tracking-wider uppercase rounded-full mb-4">
              FAQ
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-charcoal">Common Questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-24 bg-charcoal text-white text-center">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-4 text-white">Become a Dealer Today</h2>
          <p className="text-white/70 mb-8 leading-relaxed">
            Join the Himalayan Koh dealer network and start offering premium Himalayan pink salt to your customers.
          </p>
          <Link to="/dealer/register" className="btn-hk-primary">
            Apply Now
            <ArrowRight size={16} className="ml-2" />
          </Link>
        </div>
      </section>
    </div>
  );
}
