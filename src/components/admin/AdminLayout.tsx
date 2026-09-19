'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  SquaresFour,
  Package,
  Tag,
  Gift,
  Megaphone,
  ShoppingCart,
  Users as UsersIcon,
  UserGear,
  TreeStructure,
  Star,
  FileText,
  YoutubeLogo,
  Sparkle,
  TrendUp,
  PaperPlaneRight,
  Stack,
  Robot,
  List,
  Target,
  Cpu,
  CreditCard,
  GearSix,
  BookBookmark,
  Truck,
  ArrowLeft,
  SignOut,
  MagnifyingGlass,
  ShieldCheck,
  Plus,
  X,
} from '@phosphor-icons/react';
import { useAuthContext } from '../../context/AuthContext';
import { clearSupabaseSession } from '../../lib/supabase/client';

export interface AdminLayoutProps {
  children: ReactNode;
}

type NavIcon = React.ComponentType<Record<string, unknown>>;
type NavItem = { to: string; icon: NavIcon; label: string; g: string; dot: string };

const SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [
      { to: '/admin', icon: SquaresFour, label: 'Dashboard', g: 'linear-gradient(135deg,#3b82f6,#22d3ee)', dot: '#38bdf8' },
    ],
  },
  {
    title: 'Catalog',
    items: [
      { to: '/admin/products', icon: Package, label: 'Products', g: 'linear-gradient(135deg,#8b5cf6,#a855f7)', dot: '#a78bfa' },
      { to: '/admin/promotions', icon: Tag, label: 'Promotions', g: 'linear-gradient(135deg,#ec4899,#f43f5e)', dot: '#f472b6' },
      { to: '/admin/gift-drop', icon: Gift, label: 'Gift Drop', g: 'linear-gradient(135deg,#f59e0b,#fbbf24)', dot: '#fbbf24' },
      { to: '/admin/campaigns', icon: Megaphone, label: 'Campaigns', g: 'linear-gradient(135deg,#f472b6,#e879f9)', dot: '#f9a8d4' },
      { to: '/admin/orders', icon: ShoppingCart, label: 'Orders', g: 'linear-gradient(135deg,#10b981,#14b8a6)', dot: '#34d399' },
      { to: '/admin/customers', icon: UsersIcon, label: 'Customers', g: 'linear-gradient(135deg,#6366f1,#3b82f6)', dot: '#818cf8' },
      { to: '/admin/users', icon: UserGear, label: 'Users', g: 'linear-gradient(135deg,#6366f1,#818cf8)', dot: '#818cf8' },
      { to: '/admin/categories', icon: TreeStructure, label: 'Categories', g: 'linear-gradient(135deg,#f59e0b,#f97316)', dot: '#fbbf24' },
      { to: '/admin/reviews', icon: Star, label: 'Reviews', g: 'linear-gradient(135deg,#eab308,#f59e0b)', dot: '#facc15' },
      { to: '/admin/blog', icon: FileText, label: 'Blog Posts', g: 'linear-gradient(135deg,#0ea5e9,#06b6d4)', dot: '#38bdf8' },
      { to: '/admin/category-hubs', icon: SquaresFour, label: 'Category Hubs', g: 'linear-gradient(135deg,#14b8a6,#06b6d4)', dot: '#2dd4bf' },
      { to: '/admin/inventory', icon: Stack, label: 'Inventory', g: 'linear-gradient(135deg,#8b5cf6,#6366f1)', dot: '#a78bfa' },
      { to: '/admin/coupons', icon: Tag, label: 'Coupons', g: 'linear-gradient(135deg,#f43f5e,#fb7185)', dot: '#fb7185' },
    ],
  },
  {
    title: 'Media',
    items: [
      { to: '/admin/media', icon: YoutubeLogo, label: 'Media Hub', g: 'linear-gradient(135deg,#ef4444,#f97316)', dot: '#f87171' },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { to: '/admin/seo', icon: Sparkle, label: 'SEO Engine', g: 'linear-gradient(135deg,#8b5cf6,#ec4899)', dot: '#c084fc' },
      { to: '/admin/marketing', icon: Megaphone, label: 'Marketing Gen', g: 'linear-gradient(135deg,#f97316,#eab308)', dot: '#fbbf24' },
      { to: '/admin/marketing-traffic', icon: TrendUp, label: 'Marketing & Traffic', g: 'linear-gradient(135deg,#06b6d4,#3b82f6)', dot: '#38bdf8' },
      { to: '/admin/email-marketing', icon: PaperPlaneRight, label: 'Email Marketing', g: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', dot: '#818cf8' },
      { to: '/admin/crm', icon: UsersIcon, label: 'CRM (Leads)', g: 'linear-gradient(135deg,#22c55e,#84cc16)', dot: '#4ade80' },
      { to: '/admin/analytics', icon: TrendUp, label: 'Analytics', g: 'linear-gradient(135deg,#0ea5e9,#2563eb)', dot: '#38bdf8' },
    ],
  },
  {
    title: 'AI Studio',
    items: [
      { to: '/admin/variant-gen', icon: Stack, label: 'Variant Gen', g: 'linear-gradient(135deg,#8b5cf6,#d946ef)', dot: '#c084fc' },
      { to: '/admin/ai', icon: Robot, label: 'AI Hub', g: 'linear-gradient(135deg,#4f46e5,#7c3aed)', dot: '#818cf8' },
      { to: '/admin/ai-import', icon: Robot, label: 'AI Import', g: 'linear-gradient(135deg,#9333ea,#c026d3)', dot: '#c084fc' },
      { to: '/admin/listing-task', icon: List, label: 'Listing Task', g: 'linear-gradient(135deg,#2563eb,#0ea5e9)', dot: '#60a5fa' },
      { to: '/admin/scout', icon: Target, label: 'Product Scout', g: 'linear-gradient(135deg,#f43f5e,#fb923c)', dot: '#fb7185' },
      { to: '/admin/product-research', icon: TrendUp, label: 'Product Research', g: 'linear-gradient(135deg,#0d9488,#0891b2)', dot: '#2dd4bf' },
      { to: '/admin/ai-control', icon: Cpu, label: 'AI Control', g: 'linear-gradient(135deg,#0ea5e9,#8b5cf6)', dot: '#60a5fa' },
      { to: '/admin/ai-intelligence', icon: Sparkle, label: 'AI Intelligence', g: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', dot: '#a78bfa' },
      { to: '/admin/leados', icon: Target, label: 'LeadOS', g: 'linear-gradient(135deg,#6366f1,#8b5cf6)', dot: '#a5b4fc' },
    ],
  },
  {
    title: 'System',
    items: [
      { to: '/admin/labels', icon: Truck, label: 'Shipping Labels', g: 'linear-gradient(135deg,#10b981,#14b8a6)', dot: '#34d399' },
      { to: '/admin/suppliers', icon: Package, label: 'Suppliers', g: 'linear-gradient(135deg,#10b981,#06b6d4)', dot: '#34d399' },
      { to: '/admin/payments', icon: CreditCard, label: 'Payments', g: 'linear-gradient(135deg,#635bff,#8b5cf6)', dot: '#a78bfa' },
      { to: '/admin/settings', icon: GearSix, label: 'Settings', g: 'linear-gradient(135deg,#94a3b8,#64748b)', dot: '#cbd5e1' },
      { to: '/admin/listing-playbook', icon: BookBookmark, label: 'Listing Playbook', g: 'linear-gradient(135deg,#0ea5e9,#6366f1)', dot: '#60a5fa' },
    ],
  },
];

const MOBILE_NAV: { key: string; label: string; to?: string; icon: NavIcon }[] = [
  { key: 'home', label: 'Home', to: '/admin', icon: SquaresFour },
  { key: 'products', label: 'Listings', to: '/admin/products', icon: Package },
  { key: 'add', label: 'Add', to: '/admin/products/new', icon: Plus },
  { key: 'orders', label: 'Orders', to: '/admin/orders', icon: ShoppingCart },
  { key: 'more', label: 'More', icon: List },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, profile } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobSide, setMobSide] = useState(false);
  const [searchVal, setSearchVal] = useState('');

  useEffect(() => {
    setMobSide(false);
  }, [location.pathname]);

  const handleSignOut = () => {
    clearSupabaseSession();
    window.location.assign('/login');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchVal.trim();
    if (!q) return;
    navigate(`/admin/products?search=${encodeURIComponent(q)}`);
  };

  const adminName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Super Admin';
  const adminInitial = String(adminName).charAt(0).toUpperCase() || 'H';

  const Sidebar = ({ mobile }: { mobile?: boolean }) => (
    <aside
      className={`flex flex-col shrink-0 ${
        mobile ? 'w-full h-full' : 'w-60 h-screen sticky top-0 hidden lg:flex'
      }`}
      style={{
        background: 'linear-gradient(180deg, #0f231b 0%, #173629 55%, #0f231b 100%)',
        boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.05)',
      }}
    >
      {/* Brand */}
      <div className="px-3.5 py-4 border-b border-white/[0.06] flex items-center gap-2.5">
        <span
          className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-emerald-950/40 border border-white/10"
          style={{ background: 'linear-gradient(135deg, #1E4636, #C5A880)' }}
        >
          HK
        </span>
        <div className="leading-tight">
          <span className="font-bold text-sm text-white tracking-tight block">Himalayan Koh</span>
          <span className="text-[9px] uppercase tracking-[0.2em] text-slate-400 font-medium">Admin Console</span>
        </div>
        {mobile && (
          <button
            onClick={() => setMobSide(false)}
            className="ml-auto p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"
            aria-label="Close menu"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-2 space-y-4 overflow-y-auto">
        {SECTIONS.map((sec) => (
          <div key={sec.title}>
            <p className="px-2.5 mb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
              {sec.title}
            </p>
            <div className="space-y-0.5">
              {sec.items.map((l) => {
                const isActive =
                  location.pathname === l.to ||
                  (l.to !== '/admin' && location.pathname.startsWith(`${l.to}/`));
                const Icon = l.icon;
                return (
                  <Link
                    key={l.to}
                    to={l.to}
                    className={`group relative flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[12px] font-medium transition-all duration-200 ${
                      isActive ? 'text-white' : 'text-slate-300 hover:text-white'
                    }`}
                    style={
                      isActive
                        ? {
                            background: 'linear-gradient(90deg, rgba(30,70,54,0.55), rgba(46,95,73,0.30))',
                            boxShadow: 'inset 0 0 0 1px rgba(197,168,128,0.35)',
                          }
                        : undefined
                    }
                  >
                    {isActive && (
                      <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                        style={{ background: 'linear-gradient(180deg,#34d399,#C5A880)' }}
                      />
                    )}
                    <span
                      className={`min-w-[26px] min-h-[26px] w-[26px] h-[26px] rounded-md flex items-center justify-center text-white transition-all duration-200 ${
                        isActive ? 'scale-105' : 'opacity-90 group-hover:scale-105 group-hover:opacity-100'
                      }`}
                      style={{
                        background: l.g,
                        boxShadow: isActive ? `0 2px 10px ${l.dot}40` : '0 1px 4px rgba(0,0,0,0.3)',
                      }}
                    >
                      <Icon size={13} weight="bold" />
                    </span>
                    <span className="truncate">{l.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer / Store / Logout */}
      <div className="p-2 border-t border-white/[0.06] space-y-0.5">
        <Link
          to="/"
          className="flex items-center gap-2 text-[11px] text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
        >
          <span className="w-[26px] h-[26px] rounded-md bg-white/5 flex items-center justify-center">
            <ArrowLeft size={12} />
          </span>
          Storefront
        </Link>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-[11px] text-red-400 hover:text-red-300 px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 w-full transition-colors"
        >
          <span className="w-[26px] h-[26px] rounded-md bg-red-500/10 flex items-center justify-center">
            <SignOut size={12} />
          </span>
          Logout
        </button>
      </div>
    </aside>
  );

  return (
    <div className="h-screen bg-gray-100 flex overflow-hidden font-sans">
      <Sidebar />

      {/* Mobile Drawer */}
      {mobSide && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setMobSide(false)} />
          <div className="absolute left-0 top-0 h-full w-64 shadow-2xl">
            <Sidebar mobile />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 shrink-0 bg-white/90 backdrop-blur-md border-b border-gray-200/80 flex items-center justify-between gap-3 px-4 lg:px-6 z-40">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobSide(true)}
              className="lg:hidden p-1.5 hover:bg-gray-100 rounded-lg text-gray-600"
              aria-label="Open sidebar"
            >
              <List size={18} />
            </button>
            <form
              onSubmit={handleSearch}
              className="hidden md:flex items-center gap-2 bg-gray-100/90 border border-gray-200 rounded-lg px-3 py-1.5 w-64 focus-within:ring-2 focus-within:ring-emerald-600/20 focus-within:border-emerald-600"
            >
              <MagnifyingGlass size={13} className="text-gray-400 shrink-0" />
              <input
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                placeholder="Search products…"
                className="bg-transparent text-xs outline-none w-full placeholder:text-gray-400"
              />
              <span className="text-[9px] text-gray-400 border border-gray-300 rounded px-1 py-px font-medium">
                ⌘K
              </span>
            </form>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
            <button
              className="relative p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700 transition-colors"
              title="System Secure & Verified"
            >
              <ShieldCheck size={16} />
              <span
                className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
                style={{ background: 'linear-gradient(135deg,#1E4636,#C5A880)' }}
              />
            </button>
            <div className="flex items-center gap-2 pl-1.5 border-l border-gray-200">
              <span className="text-xs font-medium text-gray-700 hidden sm:block">{adminName}</span>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-md shadow-emerald-950/20 ring-2 ring-white"
                style={{ background: 'linear-gradient(135deg, #1E4636, #2d634d)' }}
              >
                {adminInitial}
              </div>
            </div>
          </div>
        </header>

        {/* Content Canvas */}
        <main
          className="flex-1 overflow-y-auto min-w-0 p-3 pb-24 lg:p-5"
          style={{ background: 'linear-gradient(180deg, #FAF8F5 0%, #F5F2EC 100%)' }}
        >
          {children}
        </main>

        {/* Mobile quick navigation */}
        <nav
          className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur border-t border-gray-200 shadow-[0_-4px_20px_rgba(15,23,42,0.08)]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          aria-label="Admin quick navigation"
        >
          <div className="grid grid-cols-5 max-w-lg mx-auto">
            {MOBILE_NAV.map((it) => {
              if (it.key === 'more') {
                return (
                  <button
                    key="more"
                    type="button"
                    onClick={() => setMobSide(true)}
                    className="flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-gray-500 hover:text-gray-800 min-h-[52px]"
                  >
                    <span className="p-1.5">
                      <List size={20} />
                    </span>
                    More
                  </button>
                );
              }
              const on =
                it.key === 'home'
                  ? location.pathname === '/admin'
                  : it.key === 'products'
                  ? location.pathname.startsWith('/admin/products') && !location.pathname.startsWith('/admin/products/new')
                  : it.key === 'add'
                  ? location.pathname.startsWith('/admin/products/new')
                  : it.key === 'orders'
                  ? location.pathname.startsWith('/admin/orders')
                  : false;
              const Icon = it.icon;
              return (
                <Link
                  key={it.key}
                  to={it.to || '/admin'}
                  className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] min-h-[52px] ${
                    on ? 'text-emerald-700 font-semibold' : 'text-gray-500 font-medium hover:text-gray-700'
                  }`}
                >
                  <span className={`px-3 py-1 rounded-xl ${on ? 'bg-emerald-50 text-emerald-700' : ''}`}>
                    <Icon size={20} weight={on ? 'bold' : 'regular'} />
                  </span>
                  {it.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
