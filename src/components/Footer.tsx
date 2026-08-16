import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Phone, ArrowRight, Send } from 'lucide-react';
import { productsPathForCategoryTitle } from '../lib/categoryContent';

const aboutLinks = [
  { label: 'About Himalayan Koh', to: '/about' },
  { label: 'Shop Products', to: '/products' },
  { label: 'Customer Login', to: '/login' },
  { label: 'Admin Login', to: '/login', state: { from: '/admin' } },
  { label: 'Contact Us', to: '/contact' },
  { label: 'Return Policy', to: '/return' },
  { label: 'Privacy Policy', to: '/privacy' },
];

const productLinks = [
  { label: 'Edible Cooking Salt', to: productsPathForCategoryTitle('Edible Cooking Salt') },
  { label: 'Salt Lick for Horses', to: productsPathForCategoryTitle('Salt Lick for Horses') },
  { label: 'Salt for Cattle', to: productsPathForCategoryTitle('Salt for Cattle') },
  { label: 'Salt Blocks for Deer', to: productsPathForCategoryTitle('Salt Blocks for Deer') },
];

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubscribeError(null);
    const value = email.trim();
    if (!value) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setSubscribeError('Enter a valid email address.');
      return;
    }

    setSubscribing(true);
    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value, source: 'footer' }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error || 'Unable to subscribe.');
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 4000);
    } catch (err) {
      setSubscribeError(
        err instanceof Error ? err.message : 'Unable to subscribe. Please try again.'
      );
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <footer id="contact" className="bg-charcoal text-cream">
      {/* Newsletter Strip */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 md:py-16">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div>
              <h3 className="font-serif text-2xl md:text-3xl font-bold mb-4 text-white">
                Stay Updated
              </h3>
              <p className="text-white/90 text-base md:text-lg leading-relaxed">
                Subscribe for exclusive offers, livestock health tips, and product updates.
              </p>
            </div>
            <div>
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-light" />
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={subscribing}
                    aria-label="Email address for newsletter"
                    className="w-full pl-11 pr-4 py-3 bg-white text-charcoal border border-white/20 rounded-xl placeholder:text-charcoal-light focus:outline-none focus:ring-2 focus:ring-himalayan transition-all disabled:opacity-60"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={subscribing}
                  className={`px-7 min-h-11 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-himalayan/30 transition-all duration-300 disabled:opacity-70 ${
                    subscribed
                      ? 'bg-himalayan-green text-cream'
                      : 'bg-himalayan hover:bg-himalayan-dark text-cream'
                  }`}
                >
                  {subscribing ? (
                    <span>Subscribing…</span>
                  ) : subscribed ? (
                    'Subscribed!'
                  ) : (
                    <>
                      <Send size={16} />
                      <span>Subscribe</span>
                    </>
                  )}
                </motion.button>
              </form>
              {subscribeError && (
                <p className="mt-2 text-sm text-amber-300">{subscribeError}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-8">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <img
              src="/logo.svg"
              alt="Himalayan Koh"
              loading="lazy"
              decoding="async"
              className="h-12 mb-5 brightness-0 invert"
            />
            <p className="text-white/60 text-sm leading-relaxed mb-6 max-w-xs">
              Premium Himalayan Pink Salt products for livestock, horses, cattle, deer, and gourmet cooking. Trusted by ranchers across America.
            </p>

          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-serif font-bold text-lg mb-6 text-white">Quick Links</h4>
            <ul className="space-y-3">
              {aboutLinks.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} state={'state' in link ? link.state : undefined} className="text-white/60 text-sm hover:text-himalayan transition-colors flex items-center gap-1 group">
                    <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Products */}
          <div>
            <h4 className="font-serif font-bold text-lg mb-6 text-white">Products</h4>
            <ul className="space-y-3">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-white/60 text-sm hover:text-himalayan transition-colors flex items-center gap-1 group">
                    <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-serif font-bold text-lg mb-6 text-white">Contact Us</h4>
            <div className="space-y-4">
              <a href="mailto:sales@himalayankoh.com" className="flex items-center gap-3 text-white/60 text-sm hover:text-himalayan transition-colors">
                <Mail size={18} className="text-himalayan flex-shrink-0" />
                sales@himalayankoh.com
              </a>
              <a href="tel:8322246466" className="flex items-center gap-3 text-white/60 text-sm hover:text-himalayan transition-colors">
                <Phone size={18} className="text-himalayan flex-shrink-0" />
                (832) 224-6466
              </a>
            </div>

            {/* Trust badges */}
            <div className="mt-6 flex items-center gap-3">
              <div className="px-3 py-1.5 bg-white/10 rounded-lg text-xs text-white/60">
                🔒 Secure Checkout
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-white/40">
          <p>Copyright © 2026 Himalayan Koh. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-white/60 transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-white/60 transition-colors">Terms of Service</Link>
            <Link to="/return" className="hover:text-white/60 transition-colors">Return Policy</Link>
            <a href="/sitemap.xml" className="hover:text-white/60 transition-colors">Sitemap</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
