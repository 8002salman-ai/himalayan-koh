import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  ChevronDown,
  ExternalLink,
  Home,
  LogOut,
  Package,
  Search,
  ShoppingCart,
  Users,
} from 'lucide-react';
import { ADMIN_NAV_GROUPS, findAdminNavItem } from '../../lib/adminNav';
import { useAuthContext } from '../../context/AuthContext';
import { isSupabaseConfigured, supabase, clearSupabaseSession } from '../../lib/supabase/client';
import {
  ADMIN_CANVAS_MIN_WIDTH,
  ICON_TILE,
  ICON_TILE_TONES,
  RAIL_LINK_ACTIVE,
  RAIL_LINK_BASE,
  RAIL_LINK_IDLE,
  RAIL_WIDTH,
  SURFACE,
} from './adminTheme';
import { AdminChip } from './AdminUI';
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

/**
 * The admin console shell.
 *
 * Two decisions worth keeping:
 *
 * 1. It is a desktop application frame, not a responsive page. The canvas has a
 *    fixed minimum width, the rail is always a rail and the content pane is the
 *    only thing that scrolls. Narrowing the viewport therefore produces
 *    horizontal scrolling of a desktop console — it never converts the admin
 *    into mobile cards, a hamburger drawer or a bottom bar. The public
 *    storefront keeps its own responsive behaviour; this file does not touch it.
 * 2. All scrolling happens inside the frame (`h-screen` + per-pane overflow), so
 *    the rail and header cannot scroll out of view and the page background never
 *    shows through behind them.
 */
export default function AdminLayout({ children }: AdminLayoutProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, user } = useAuthContext();
  const unreadCount = alerts.filter((alert) => !alert.read).length;
  const activeItem = findAdminNavItem(location.pathname);

  const handleSignOut = () => {
    // Sign out entirely client-side: wipe the persisted session synchronously
    // (all sb-* storage keys + cookies), then hard-navigate. We deliberately do
    // NOT call supabase.auth.signOut() here — it can hang on navigator.locks,
    // and worse, its async internals can re-persist the session to localStorage
    // right after we clear it, which kept re-authenticating admins on the next
    // page load. A best-effort server revoke isn't needed for the UX; the local
    // token is gone, so the user is signed out.
    clearSupabaseSession();
    window.location.assign('/login');
  };

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const term = searchTerm.trim();
    if (!term) return;
    // The console search is the product search: it hands the term to the catalog
    // page, which owns querying. Nothing here filters a second, parallel list.
    navigate(`/admin/products?search=${encodeURIComponent(term)}`);
    setSearchTerm('');
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
    <div className="h-screen overflow-hidden bg-admin-canvas text-admin-ink">
      {/* The desktop canvas: below its minimum width the console scrolls
          sideways instead of restacking into a mobile layout. */}
      <div className="h-full w-full overflow-x-auto">
        <div className="flex h-full" style={{ minWidth: ADMIN_CANVAS_MIN_WIDTH }}>
          <aside className={`flex h-full ${RAIL_WIDTH} shrink-0 flex-col bg-admin-rail`}>
            {/* The mark sits on its own light chip. Inverting the artwork to white
                filled the rail with an unreadable blob, so the brand keeps its
                real colours on a small tile instead. */}
            <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-5">
              <span className="flex h-9 w-[104px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
                <img src="/logo.svg" alt="Himalayan Koh" className="h-7 w-auto" />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-admin-rail-text">
                Admin
              </span>
            </div>

            <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
              {ADMIN_NAV_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
                    {group.label}
                  </p>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const isActive =
                        location.pathname === item.path ||
                        (item.path !== '/admin' && location.pathname.startsWith(`${item.path}/`));
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          aria-current={isActive ? 'page' : undefined}
                          className={`${RAIL_LINK_BASE} ${isActive ? RAIL_LINK_ACTIVE : RAIL_LINK_IDLE}`}
                        >
                          <item.icon size={17} className="shrink-0" />
                          <span className="truncate">{item.label}</span>
                          {item.pending && (
                            <span
                              className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400"
                              title="Built, backend integration pending"
                            />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="shrink-0 border-t border-white/10 p-3">
              <Link
                to="/"
                className={`${RAIL_LINK_BASE} ${RAIL_LINK_IDLE}`}
              >
                <ExternalLink size={17} className="shrink-0" />
                <span>View storefront</span>
              </Link>
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex h-16 shrink-0 items-center justify-between gap-6 border-b border-admin-line bg-admin-surface px-6">
              <div className="flex min-w-0 items-center gap-3">
                <Link
                  to="/admin"
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-admin-muted transition-colors hover:bg-admin-canvas hover:text-admin-ink"
                >
                  <Home size={15} />
                  Admin
                </Link>
                {activeItem && (
                  <>
                    <span className="text-admin-line-strong">/</span>
                    <span className="flex items-center gap-2 text-sm font-semibold text-admin-ink">
                      {activeItem.label}
                      {activeItem.pending && <AdminChip tone="warning">Pending</AdminChip>}
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3">
                <form onSubmit={handleSearch} className="relative">
                  <Search
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-admin-muted"
                  />
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search products…"
                    aria-label="Search products"
                    className="w-[260px] rounded-xl border border-admin-line bg-admin-canvas py-2 pl-9 pr-3 text-sm text-admin-ink placeholder:text-admin-muted/70 focus:border-himalayan focus:outline-none focus:ring-2 focus:ring-himalayan/25"
                  />
                </form>

                <div className="relative">
                  <button
                    type="button"
                    aria-label="Notifications"
                    onClick={() => {
                      setNotificationOpen((open) => !open);
                      setAlerts((current) => current.map((alert) => ({ ...alert, read: true })));
                    }}
                    className="relative rounded-xl border border-admin-line p-2 text-admin-muted transition-colors hover:bg-admin-canvas hover:text-admin-ink"
                  >
                    <Bell size={17} />
                    {unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-himalayan px-1 text-[10px] font-semibold text-white">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  <AnimatePresence>
                    {notificationOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className={`absolute right-0 z-dropdown mt-2 w-80 ${SURFACE}`}
                      >
                        <div className="border-b border-admin-line px-4 py-3">
                          <p className="text-sm font-semibold text-admin-ink">Notifications</p>
                          <p className="text-xs text-admin-muted">Realtime order and customer alerts</p>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                          {alerts.length === 0 ? (
                            <p className="px-4 py-10 text-center text-sm text-admin-muted">
                              No alerts yet
                            </p>
                          ) : (
                            alerts.map((alert) => (
                              <div
                                key={alert.id}
                                className="flex items-start gap-3 border-b border-admin-line px-4 py-3 last:border-0"
                              >
                                <span
                                  className={`${ICON_TILE} ${
                                    alert.type === 'order'
                                      ? ICON_TILE_TONES.green
                                      : alert.type === 'customer'
                                        ? ICON_TILE_TONES.violet
                                        : ICON_TILE_TONES.amber
                                  }`}
                                >
                                  {alert.type === 'order' ? (
                                    <ShoppingCart size={14} />
                                  ) : alert.type === 'customer' ? (
                                    <Users size={14} />
                                  ) : (
                                    <Package size={14} />
                                  )}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-admin-ink">{alert.title}</p>
                                  <p className="text-xs text-admin-muted">{alert.message}</p>
                                  <p className="mt-1 text-[11px] text-admin-muted">
                                    {new Date(alert.createdAt).toLocaleTimeString()}
                                  </p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((open) => !open)}
                    className="flex items-center gap-2.5 rounded-xl border border-admin-line py-1.5 pl-1.5 pr-3 transition-colors hover:bg-admin-canvas"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-himalayan to-himalayan-dark text-sm font-semibold text-white">
                      {(profile?.full_name || profile?.email || 'A').slice(0, 1).toUpperCase()}
                    </span>
                    <span className="max-w-[160px] truncate text-sm font-semibold text-admin-ink">
                      {profile?.full_name || 'Admin'}
                    </span>
                    <ChevronDown size={15} className="text-admin-muted" />
                  </button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className={`absolute right-0 z-dropdown mt-2 w-60 ${SURFACE}`}
                      >
                        <div className="border-b border-admin-line px-4 py-3">
                          <p className="truncate text-sm font-semibold text-admin-ink">
                            {profile?.full_name || 'Admin'}
                          </p>
                          <p className="truncate text-xs text-admin-muted">
                            {profile?.email || user?.email || ''}
                          </p>
                          <div className="mt-2">
                            <AdminChip tone={profile?.role === 'admin' ? 'brand' : 'neutral'}>
                              {profile?.role === 'admin' ? 'Super Admin' : (profile?.role ?? 'user')}
                            </AdminChip>
                          </div>
                        </div>
                        <Link
                          to="/account"
                          onClick={() => setUserMenuOpen(false)}
                          className="block px-4 py-2.5 text-sm text-admin-ink hover:bg-admin-canvas"
                        >
                          My profile
                        </Link>
                        <Link
                          to="/admin/users"
                          onClick={() => setUserMenuOpen(false)}
                          className="block px-4 py-2.5 text-sm text-admin-ink hover:bg-admin-canvas"
                        >
                          Users &amp; Roles
                        </Link>
                        <Link
                          to="/admin/settings"
                          onClick={() => setUserMenuOpen(false)}
                          className="block px-4 py-2.5 text-sm text-admin-ink hover:bg-admin-canvas"
                        >
                          Settings
                        </Link>
                        <button
                          type="button"
                          onClick={handleSignOut}
                          className="flex w-full items-center gap-2 border-t border-admin-line px-4 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
                        >
                          <LogOut size={15} />
                          Sign out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </header>

            <main className="flex-1 overflow-y-auto px-6 py-6">
              <div className="mx-auto w-full max-w-[1600px] space-y-5">{children}</div>
            </main>
          </div>
        </div>
      </div>

      {userMenuOpen && (
        <div className="fixed inset-0 z-nav-overlay" onClick={() => setUserMenuOpen(false)} />
      )}
      {notificationOpen && (
        <div className="fixed inset-0 z-nav-overlay" onClick={() => setNotificationOpen(false)} />
      )}

      <AIChatWidget />
    </div>
  );
}
