import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingCart,
  Truck,
  Users,
  FileText,
  Settings,
  KeyRound,
  LogOut,
  Menu,
  X,
  Bell,
  Plus,
  ChevronDown,
  BarChart3,
  Home,
  LayoutGrid,
} from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { isSupabaseConfigured, supabase } from '../../lib/supabase/client';
import AIChatWidget from '../AIChatWidget';

interface AdminAlert {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'customer' | 'inventory';
  createdAt: string;
  read: boolean;
}

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { label: 'Products', path: '/admin/products', icon: Package },
  { label: 'Categories', path: '/admin/categories', icon: FolderTree },
  { label: 'Orders', path: '/admin/orders', icon: ShoppingCart },
  { label: 'Shipping Labels', path: '/admin/labels', icon: Truck },
  { label: 'Customers', path: '/admin/customers', icon: Users },
  { label: 'Blog Posts', path: '/admin/blog', icon: FileText },
  { label: 'Category Hubs', path: '/admin/category-hubs', icon: LayoutGrid },
  { label: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
  { label: 'Settings', path: '/admin/settings', icon: Settings },
  { label: 'API Keys', path: '/admin/api-keys', icon: KeyRound },
];

const mobileNavItems = [
  { label: 'Home', path: '/admin', icon: LayoutDashboard },
  { label: 'Products', path: '/admin/products', icon: Package },
  { label: 'Orders', path: '/admin/orders', icon: ShoppingCart },
  { label: 'More', path: 'menu', icon: Menu },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut, user } = useAuthContext();
  const unreadCount = alerts.filter((alert) => !alert.read).length;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const addAlert = (alert: Omit<AdminAlert, 'id' | 'createdAt' | 'read'>) => {
      setAlerts((current) => [
        {
          ...alert,
          id: `${alert.type}-${Date.now()}`,
          createdAt: new Date().toISOString(),
          read: false,
        },
        ...current,
      ].slice(0, 10));
    };

    const channel = supabase
      .channel('admin-layout-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        const order = payload.new as { order_number?: string; total?: number; email?: string };
        addAlert({
          type: 'order',
          title: 'New order received',
          message: `${order.order_number || 'Order'} from ${order.email || 'customer'}${order.total ? ` · $${Number(order.total).toFixed(2)}` : ''}`,
        });
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          ...(user?.id ? { filter: `user_id=eq.${user.id}` } : {}),
        },
        (payload) => {
          const note = payload.new as { title?: string; message?: string };
          addAlert({
            type: 'order',
            title: note.title || 'Order update',
            message: note.message || 'You have a new order notification.',
          });
        }
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, (payload) => {
        const customer = payload.new as { full_name?: string; email?: string; role?: string };
        if (customer.role === 'admin') return;
        addAlert({
          type: 'customer',
          title: 'New customer activity',
          message: customer.full_name || customer.email || 'A customer joined',
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'inventory' }, (payload) => {
        const inventory = payload.new as { quantity?: number; low_stock_threshold?: number };
        if (
          typeof inventory.quantity === 'number' &&
          typeof inventory.low_stock_threshold === 'number' &&
          inventory.quantity > inventory.low_stock_threshold
        ) {
          return;
        }
        addAlert({
          type: 'inventory',
          title: 'Inventory alert',
          message: `Stock changed to ${inventory.quantity ?? 0}`,
        });
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-charcoal text-white transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
          {sidebarOpen && (
            <Link to="/admin" className="flex items-center gap-2">
              <img
                src="/logo.png"
                alt="Himalayan Koh"
                className="h-8 brightness-0 invert"
              />
            </Link>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Menu size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== '/admin' && location.pathname.startsWith(item.path));
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  isActive
                    ? 'bg-himalayan text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <item.icon size={20} />
                {sidebarOpen && <span className="font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-all"
          >
            <LogOut size={20} />
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
                <Link to="/admin" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                  <img
                    src="/logo.png"
                    alt="Himalayan Koh"
                    className="h-7 brightness-0 invert"
                  />
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>
              <nav className="flex-1 py-3 px-3 overflow-y-auto">
                <div className="grid grid-cols-3 gap-2">
                  {navItems.map((item) => {
                    const isActive = location.pathname === item.path ||
                      (item.path !== '/admin' && location.pathname.startsWith(item.path));
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl transition-all ${
                          isActive
                            ? 'bg-himalayan text-white'
                            : 'text-white/60 hover:bg-white/10 hover:text-white'
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
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-3 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <Menu size={22} />
            </button>
            <h1 className="text-lg font-semibold text-charcoal hidden sm:block">
              Admin Panel
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/admin/products?action=new"
              className="hidden sm:inline-flex items-center gap-2 px-3 py-2 bg-himalayan text-white rounded-xl text-sm font-semibold hover:bg-himalayan-dark transition-colors"
            >
              <Plus size={16} />
              Quick Add
            </Link>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => {
                  setNotificationOpen(!notificationOpen);
                  setAlerts((current) => current.map((alert) => ({ ...alert, read: true })));
                }}
                className="relative p-2 hover:bg-gray-100 rounded-lg"
              >
                <Bell size={20} className="text-charcoal-light" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notificationOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50"
                  >
                    <div className="px-4 py-3 border-b border-gray-100">
                      <h3 className="font-semibold text-charcoal">Notifications</h3>
                      <p className="text-xs text-charcoal-light">Realtime admin alerts</p>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {alerts.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-charcoal-light">
                          No alerts yet
                        </div>
                      ) : (
                        alerts.map((alert) => (
                          <div key={alert.id} className="px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50">
                            <div className="flex items-start gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${alertColor(alert.type)}`}>
                                {alert.type === 'order' ? <ShoppingCart size={15} /> : alert.type === 'customer' ? <Users size={15} /> : <Package size={15} />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-charcoal">{alert.title}</p>
                                <p className="text-xs text-charcoal-light line-clamp-2">{alert.message}</p>
                                <p className="text-[11px] text-charcoal-light mt-1">
                                  {new Date(alert.createdAt).toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <Link
                      to="/admin"
                      onClick={() => setNotificationOpen(false)}
                      className="block px-4 py-3 text-sm font-semibold text-himalayan hover:bg-gray-50 border-t border-gray-100"
                    >
                      View Dashboard
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg"
              >
                <div className="w-8 h-8 bg-himalayan-lighter rounded-full flex items-center justify-center">
                  <span className="text-himalayan font-semibold text-sm">
                    {profile?.full_name?.[0] || 'A'}
                  </span>
                </div>
                <span className="hidden sm:block text-sm font-medium text-charcoal">
                  {profile?.full_name || 'Admin'}
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
                      to="/account"
                      className="block px-4 py-2 text-sm text-charcoal hover:bg-gray-50"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      My Profile
                    </Link>
                    <Link
                      to="/admin/settings"
                      className="block px-4 py-2 text-sm text-charcoal hover:bg-gray-50"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Settings
                    </Link>
                    <hr className="my-2" />
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-3 pb-24 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-gray-200 px-1 pt-1 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] shadow-[0_-8px_24px_rgba(0,0,0,0.07)]">
        <div className="grid grid-cols-4 gap-0.5">
          {mobileNavItems.map((item) => {
            const isMenu = item.path === 'menu';
            const isActive = !isMenu && (
              location.pathname === item.path ||
              (item.path !== '/admin' && location.pathname.startsWith(item.path))
            );
            const content = (
              <>
                <item.icon size={19} />
                <span className="text-[10px] font-semibold">{item.label}</span>
              </>
            );

            if (isMenu) {
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-charcoal-light hover:bg-gray-50"
                >
                  {content}
                </button>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 ${
                  isActive ? 'bg-himalayan text-white' : 'text-charcoal-light hover:bg-gray-50'
                }`}
              >
                {content}
              </Link>
            );
          })}
        </div>
      </nav>

      <Link
        to="/admin/products?action=new"
        className="lg:hidden fixed right-3 bottom-[4.5rem] z-50 w-12 h-12 rounded-full bg-himalayan text-white shadow-xl flex items-center justify-center"
        aria-label="Quick add product"
      >
        <Plus size={22} />
      </Link>

      {/* Click outside to close user menu */}
      {userMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setUserMenuOpen(false)}
        />
      )}
      {notificationOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setNotificationOpen(false)}
        />
      )}

      <AIChatWidget />
    </div>
  );
}

function alertColor(type: AdminAlert['type']) {
  if (type === 'order') return 'text-green-600 bg-green-50';
  if (type === 'customer') return 'text-purple-600 bg-purple-50';
  return 'text-amber-600 bg-amber-50';
}
