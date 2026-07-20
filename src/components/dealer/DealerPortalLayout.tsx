import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Menu, X, ChevronDown, Home } from 'lucide-react';
import { DEALER_NAV_ITEMS, DEALER_MOBILE_NAV_ITEMS } from '../../lib/dealerNav';
import { useAuthContext } from '../../context/AuthContext';

interface DealerPortalLayoutProps {
  children: React.ReactNode;
}

export default function DealerPortalLayout({ children }: DealerPortalLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const { profile, signOut } = useAuthContext();

  const handleSignOut = async () => {
    // Mark this as an intentional sign-out so DealerRoute routes the now
    // logged-out session to the confirmation page instead of the login form.
    // Navigating here directly would race DealerRoute, which re-renders the
    // moment auth state clears and would otherwise win.
    sessionStorage.setItem('dealer-signed-out', '1');
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-charcoal text-white transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
          {sidebarOpen && (
            <Link to="/dealer/dashboard" className="flex items-center gap-2">
              <img src="/logo.svg" alt="Himalayan Koh" className="h-8 brightness-0 invert" />
              <span className="text-xs font-semibold uppercase tracking-wider text-himalayan">Wholesale</span>
            </Link>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Menu size={20} />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto scrollbar-thin">
          {DEALER_NAV_ITEMS.map((item) => {
            const isActive =
              location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  isActive ? 'bg-himalayan text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <item.icon size={20} />
                {sidebarOpen && <span className="font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-all"
          >
            <Home size={20} />
            {sidebarOpen && <span className="font-medium">Back to Site</span>}
          </Link>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="fixed left-0 top-0 bottom-0 w-[300px] max-w-[90vw] bg-charcoal text-white z-50 lg:hidden flex flex-col"
            >
              <div className="h-14 flex items-center justify-between px-3 border-b border-white/10">
                <Link
                  to="/dealer/dashboard"
                  className="flex items-center gap-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <img src="/logo.svg" alt="Himalayan Koh" className="h-7 brightness-0 invert" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-himalayan">Wholesale</span>
                </Link>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 hover:bg-white/10 rounded-lg">
                  <X size={18} />
                </button>
              </div>
              <nav className="flex-1 py-3 px-3 overflow-y-auto scrollbar-thin">
                <div className="grid grid-cols-3 gap-2">
                  {DEALER_NAV_ITEMS.map((item) => {
                    const isActive =
                      location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl transition-all ${
                          isActive ? 'bg-himalayan text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <item.icon size={20} />
                        <span className="text-[11px] font-medium text-center leading-tight">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </nav>
              <div className="px-3 py-3 border-t border-white/10">
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-white/60 hover:bg-white/10 hover:text-white transition-all text-sm"
                >
                  <Home size={18} />
                  <span className="font-medium">Back to Site</span>
                </Link>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-3 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-semibold text-charcoal hidden sm:block">Wholesale Portal</h1>
          </div>

          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg"
            >
              <div className="w-8 h-8 bg-himalayan-lighter rounded-full flex items-center justify-center">
                <span className="text-himalayan font-semibold text-sm">{profile?.full_name?.[0] || 'D'}</span>
              </div>
              <span className="hidden sm:block text-sm font-medium text-charcoal">
                {profile?.full_name || 'Wholesale'}
              </span>
              <ChevronDown size={16} className="text-charcoal-light" />
            </button>

            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50"
                >
                  <Link
                    to="/dealer/profile"
                    className="block px-4 py-2 text-sm text-charcoal hover:bg-gray-50"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    My Profile
                  </Link>
                  <hr className="my-2" />
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
        </header>

        <main className="flex-1 p-3 pb-24 lg:p-6 overflow-auto">{children}</main>
      </div>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-gray-200 px-1 pt-1 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] shadow-[0_-8px_24px_rgba(0,0,0,0.07)]">
        <div className="grid grid-cols-4 gap-0.5">
          {DEALER_MOBILE_NAV_ITEMS.map((item) => {
            const isMenu = item.path === 'menu';
            const isActive = !isMenu && (location.pathname === item.path || location.pathname.startsWith(`${item.path}/`));
            const content = (
              <>
                <item.icon size={20} />
                <span className="text-[10px] font-semibold">{item.label}</span>
              </>
            );

            if (isMenu) {
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="min-h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 text-charcoal-light hover:bg-gray-50"
                >
                  {content}
                </button>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`min-h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 ${
                  isActive ? 'bg-himalayan text-white' : 'text-charcoal-light hover:bg-gray-50'
                }`}
              >
                {content}
              </Link>
            );
          })}
        </div>
      </nav>

      {userMenuOpen && <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />}
    </div>
  );
}
