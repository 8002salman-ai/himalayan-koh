import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShoppingCart, User, Menu, X, Phone, MapPin, Calculator, LogOut } from 'lucide-react';
import { useCart } from '../store/cartStore';
import { useAuthContext } from '../context/AuthContext';
import CartDrawer from './CartDrawer';
import SearchModal from './SearchModal';
import AuthModal from './AuthModal';
import AIChatWidget from './AIChatWidget';
import Footer from './Footer';
import ScrollToTop from './ScrollToTop';

const navLinks = [
  { label: 'Home', path: '/' },
  { label: 'Products', path: '/products' },
  { label: 'About Us', path: '/about' },
  { label: 'Blog', path: '/blog' },
  { label: 'Gallery', path: '/gallery' },
  { label: 'Contact', path: '/contact' },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const { totalItems } = useCart();
  const { isAuthenticated, profile, signOut, user } = useAuthContext();

  const handleSignOut = async () => {
    await signOut();
    setUserMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[120] focus:px-4 focus:py-2 focus:bg-hk-green focus:text-hk-panel focus:rounded-lg"
      >
        Skip to main content
      </a>
      {/* Announcement Bar */}
      <div className="bg-hk-paper border-b border-hk-line text-sm text-hk-ink">
        <motion.div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-center sm:text-left tracking-wide">
            <strong className="font-extrabold text-hk-green">All Natural</strong>{' '}
            Himalayan salt for horses, cattle and deer
          </p>
          <div className="flex items-center gap-4 text-xs sm:text-sm font-semibold">
            <Link to="/contact" className="flex items-center gap-1 hover:text-hk-rose-dark transition-colors">
              <MapPin size={14} />
              <span className="hidden md:inline">Product Locator</span>
            </Link>
            <Link to="/checkout" className="flex items-center gap-1 hover:text-hk-rose-dark transition-colors">
              <Calculator size={14} />
              <span className="hidden md:inline">Calculate Shipping</span>
            </Link>
            <a href="tel:8322246466" className="flex items-center gap-1 text-hk-green hover:text-hk-rose-dark transition-colors">
              <Phone size={14} />
              <strong>Call: (832) 224-6466</strong>
            </a>
          </div>
        </motion.div>
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-hk-panel/95 backdrop-blur-xl border-b border-hk-line shadow-[0_10px_30px_rgba(33,29,24,0.07)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 shrink-0">
              <img
                src="/logo.svg"
                alt="Himalayan Koh — Salt that Heals"
                className="h-11 md:h-[3.75rem] w-auto"
              />
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-0.5">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`relative px-3 py-2 text-[0.82rem] font-extrabold uppercase tracking-[0.035em] transition-colors rounded-lg ${
                    location.pathname === link.path
                      ? 'text-hk-rose-dark'
                      : 'text-hk-ink hover:text-hk-rose-dark'
                  }`}
                >
                  {link.label}
                  {location.pathname === link.path && (
                    <motion.div
                      layoutId="navIndicator"
                      className="absolute bottom-0 left-3 right-3 h-0.5 bg-hk-rose rounded-full"
                    />
                  )}
                </Link>
              ))}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSearchOpen(true)}
                className="p-2 rounded-lg border border-hk-line hover:border-hk-rose/40 hover:bg-hk-paper transition-colors"
                aria-label="Search"
              >
                <Search size={20} className="text-hk-ink" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCartOpen(true)}
                className="p-2 rounded-lg border border-hk-line hover:border-hk-rose/40 hover:bg-hk-paper transition-colors relative"
                aria-label="Cart"
              >
                <ShoppingCart size={20} className="text-hk-ink" />
                {totalItems > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 bg-hk-green text-hk-panel text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold"
                  >
                    {totalItems}
                  </motion.span>
                )}
              </motion.button>

              {/* User Menu */}
              <div className="relative hidden sm:block">
                {isAuthenticated ? (
                  <div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="p-2 rounded-lg border border-hk-line bg-hk-paper transition-colors"
                    >
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.full_name || 'User'}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                      ) : (
                        <User size={20} className="text-hk-green" />
                      )}
                    </motion.button>

                    <AnimatePresence>
                      {userMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50"
                        >
                          <div className="px-4 py-2 border-b border-gray-100">
                            <p className="font-semibold text-charcoal text-sm truncate">
                              {profile?.full_name || 'User'}
                            </p>
                            <p className="text-xs text-charcoal-light truncate">
                              {user?.email}
                            </p>
                          </div>
                          <Link
                            to="/account"
                            className="block px-4 py-2 text-sm text-charcoal hover:bg-gray-50"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            My Account
                          </Link>
                          <Link
                            to="/orders"
                            className="block px-4 py-2 text-sm text-charcoal hover:bg-gray-50"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            My Orders
                          </Link>
                          <button
                            onClick={handleSignOut}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <LogOut size={14} />
                            Sign Out
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setAuthOpen(true)}
                    className="btn-hk-ghost !min-h-[46px] !px-4 !py-2 !text-xs"
                    aria-label="Login"
                  >
                    <User size={18} className="mr-1.5" />
                    Login
                  </motion.button>
                )}
              </div>

              {/* Mobile menu button */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden p-2 rounded-full hover:bg-himalayan-lighter transition-colors"
                aria-label="Menu"
              >
                {mobileOpen ? <X size={22} /> : <Menu size={22} />}
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden fixed top-[104px] left-0 right-0 z-40 bg-hk-panel border-t border-hk-line shadow-xl overflow-hidden"
          >
            <nav className="max-w-7xl mx-auto px-4 py-4 space-y-1">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.path}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    to={link.path}
                    onClick={() => setMobileOpen(false)}
                    className={`block px-4 py-3 rounded-lg text-sm font-extrabold uppercase tracking-wide transition-colors ${
                      location.pathname === link.path
                        ? 'bg-hk-paper text-hk-rose-dark'
                        : 'text-hk-ink hover:bg-hk-paper'
                    }`}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                {isAuthenticated ? (
                  <button
                    onClick={() => { handleSignOut(); setMobileOpen(false); }}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl text-base font-medium text-red-600 hover:bg-red-50 transition-colors w-full"
                  >
                    <LogOut size={18} />
                    Sign Out
                  </button>
                ) : (
                  <button
                    onClick={() => { setAuthOpen(true); setMobileOpen(false); }}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl text-base font-medium text-charcoal hover:bg-gray-50 transition-colors w-full"
                  >
                    <User size={18} />
                    Login
                  </button>
                )}
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close user menu */}
      {userMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setUserMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main id="main-content" className="flex-1" tabIndex={-1}>
        {children}
      </main>

      {/* Footer */}
      <Footer />

      {/* Modals & Drawers */}
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      <AIChatWidget />
      <ScrollToTop />
    </div>
  );
}
