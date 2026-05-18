import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Mail, Phone, ArrowRight, Send } from 'lucide-react';

const aboutLinks = [
  { label: 'About Himalayan Koh', to: '/about' },
  { label: 'Shop Products', to: '/products' },
  { label: 'Customer Login', to: '/login' },
  { label: 'Admin Login', to: '/login', state: { from: '/admin' } },
  { label: 'Blog Posts', to: '/blog' },
  { label: 'Contact Us', to: '/contact' },
  { label: 'FAQ', to: '/contact' },
  { label: 'Return Policy', to: '/contact' },
  { label: 'Terms & Conditions', to: '/terms' },
  { label: 'Privacy Policy', to: '/privacy' },
];

const productLinks = [
  { label: 'Salt Lick for Horses', to: '/products' },
  { label: 'Salt Blocks for Deer', to: '/products' },
  { label: 'Salt for Cattle', to: '/products' },
  { label: 'Edible Cooking Salt', to: '/products' },
  { label: 'Bulk Orders', to: '/contact' },
  { label: 'Gift Sets', to: '/products' },
];

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  return (
    <footer id="contact" className="bg-hk-ink text-hk-panel">
      {/* Newsletter Strip */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-14">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="font-serif text-2xl md:text-3xl font-bold mb-2">
                Stay Updated
              </h3>
              <p className="text-white/60">
                Subscribe for exclusive offers, livestock health tips, and product updates.
              </p>
            </div>
            <form onSubmit={handleSubscribe} className="flex gap-3">
              <div className="flex-1 relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3.5 bg-white/10 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-himalayan/50 focus:border-himalayan/50 transition-all"
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className={`px-6 py-3.5 rounded-xl font-semibold flex items-center gap-2 transition-all duration-300 ${
                  subscribed
                    ? 'bg-hk-green text-hk-panel'
                    : 'bg-hk-rose hover:bg-hk-rose-dark text-hk-panel'
                }`}
              >
                {subscribed ? (
                  'Subscribed!'
                ) : (
                  <>
                    <Send size={16} />
                    <span className="hidden sm:inline">Subscribe</span>
                  </>
                )}
              </motion.button>
            </form>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-8">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <img
              src="https://himalayankoh.com/wp-content/uploads/2017/10/logo.svg"
              alt="Himalayan Koh"
              className="h-12 mb-5 brightness-0 invert"
            />
            <p className="text-white/60 text-sm leading-relaxed mb-6 max-w-xs">
              Premium Himalayan Pink Salt products for livestock, horses, cattle, deer, and gourmet cooking. Trusted by ranchers across America.
            </p>
            <div className="flex items-center gap-3">
              {[
                  { label: 'Facebook', path: 'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z' },
                  { label: 'Instagram', path: 'M16 4H8a4 4 0 00-4 4v8a4 4 0 004 4h8a4 4 0 004-4V8a4 4 0 00-4-4zm-4 11a3 3 0 110-6 3 3 0 010 6zm4.5-7.5a1 1 0 110-2 1 1 0 010 2z' },
                  { label: 'Twitter', path: 'M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z' },
                  { label: 'YouTube', path: 'M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.25 29 29 0 00-.46-5.33zM9.75 15.02V8.48l5.75 3.27-5.75 3.27z' },
                ].map((social, i) => (
                <motion.span
                  key={i}
                  whileHover={{ scale: 1.1, y: -2 }}
                  aria-label={social.label}
                  className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-himalayan transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={social.path} />
                  </svg>
                </motion.span>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-lg mb-5">Quick Links</h4>
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
            <h4 className="font-semibold text-lg mb-5">Products</h4>
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
            <h4 className="font-semibold text-lg mb-5">Contact Us</h4>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-himalayan flex-shrink-0 mt-0.5" />
                <p className="text-white/60 text-sm leading-relaxed">
                  12620 FM 1960 W Ste A-4<br />Houston, TX 77065
                </p>
              </div>
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
              <div className="px-3 py-1.5 bg-white/10 rounded-lg text-xs text-white/60">
                🚚 Free Shipping $50+
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
            <Link to="/" className="hover:text-white/60 transition-colors">Sitemap</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
