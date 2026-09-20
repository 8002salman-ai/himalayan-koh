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

/**
 * Restricted Himalayan Koh Brand Palette for Admin Rail
 * - Rose: #B86452 -> #8D4133
 * - Salt Orange: #E25726 -> #B86452
 * - Forest: #3F6550 -> #2a4435
 * - Gold / Bronze: #C98745 -> #9e632b
 * - Neutral Slate: #453d36 -> #2d2722
 */
const SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [
      { to: '/admin', icon: SquaresFour, label: 'Dashboard', g: 'linear-gradient(135deg,#B86452,#8D4133)', dot: '#B86452' },
    ],
  },
  {
    title: 'LeadOS',
    items: [
      { to: '/admin/leados', icon: Target, label: 'LeadOS Workspace', g: 'linear-gradient(135deg,#3F6550,#2a4435)', dot: '#3F6550' },
      { to: '/admin/client-outreach', icon: PaperPlaneRight, label: 'Client Outreach', g: 'linear-gradient(135deg,#C98745,#9e632b)', dot: '#C98745' },
    ],
  },
  {
    title: 'Catalog',
    items: [
      { to: '/admin/products', icon: Package, label: 'Products', g: 'linear-gradient(135deg,#E25726,#B86452)', dot: '#E25726' },
      { to: '/admin/promotions', icon: Tag, label: 'Promotions', g: 'linear-gradient(135deg,#B86452,#8D4133)', dot: '#B86452' },
      { to: '/admin/gift-drop', icon: Gift, label: 'Gift Drop', g: 'linear-gradient(135deg,#C98745,#E25726)', dot: '#C98745' },
      { to: '/admin/campaigns', icon: Megaphone, label: 'Campaigns', g: 'linear-gradient(135deg,#B86452,#8D4133)', dot: '#B86452' },
      { to: '/admin/orders', icon: ShoppingCart, label: 'Orders', g: 'linear-gradient(135deg,#3F6550,#2a4435)', dot: '#3F6550' },
      { to: '/admin/customers', icon: UsersIcon, label: 'Customers', g: 'linear-gradient(135deg,#453d36,#2d2722)', dot: '#C98745' },
      { to: '/admin/users', icon: UserGear, label: 'Users', g: 'linear-gradient(135deg,#453d36,#2d2722)', dot: '#C98745' },
      { to: '/admin/categories', icon: TreeStructure, label: 'Categories', g: 'linear-gradient(135deg,#C98745,#9e632b)', dot: '#C98745' },
      { to: '/admin/reviews', icon: Star, label: 'Reviews', g: 'linear-gradient(135deg,#C98745,#E25726)', dot: '#C98745' },
      { to: '/admin/blog', icon: FileText, label: 'Blog Posts', g: 'linear-gradient(135deg,#B86452,#8D4133)', dot: '#B86452' },
      { to: '/admin/category-hubs', icon: SquaresFour, label: 'Category Hubs', g: 'linear-gradient(135deg,#3F6550,#2a4435)', dot: '#3F6550' },
      { to: '/admin/inventory', icon: Stack, label: 'Inventory', g: 'linear-gradient(135deg,#453d36,#2d2722)', dot: '#E25726' },
      { to: '/admin/coupons', icon: Tag, label: 'Coupons', g: 'linear-gradient(135deg,#E25726,#B86452)', dot: '#E25726' },
    ],
  },
  {
    title: 'Media',
    items: [
      { to: '/admin/media', icon: YoutubeLogo, label: 'Media Hub', g: 'linear-gradient(135deg,#C98745,#E25726)', dot: '#C98745' },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { to: '/admin/seo', icon: Sparkle, label: 'SEO Engine', g: 'linear-gradient(135deg,#B86452,#8D4133)', dot: '#B86452' },
      { to: '/admin/marketing', icon: Megaphone, label: 'Marketing Gen', g: 'linear-gradient(135deg,#E25726,#B86452)', dot: '#E25726' },
      { to: '/admin/marketing-traffic', icon: TrendUp, label: 'Marketing & Traffic', g: 'linear-gradient(135deg,#3F6550,#2a4435)', dot: '#3F6550' },
      { to: '/admin/email-marketing', icon: PaperPlaneRight, label: 'Email Marketing', g: 'linear-gradient(135deg,#B86452,#8D4133)', dot: '#B86452' },
      { to: '/admin/crm', icon: UsersIcon, label: 'CRM (Leads)', g: 'linear-gradient(135deg,#453d36,#2d2722)', dot: '#C98745' },
      { to: '/admin/analytics', icon: TrendUp, label: 'Analytics', g: 'linear-gradient(135deg,#C98745,#9e632b)', dot: '#C98745' },
    ],
  },
  {
    title: 'AI Studio',
    items: [
      { to: '/admin/variant-gen', icon: Stack, label: 'Variant Gen', g: 'linear-gradient(135deg,#3F6550,#C98745)', dot: '#C98745' },
      { to: '/admin/ai', icon: Robot, label: 'AI Hub', g: 'linear-gradient(135deg,#3F6550,#2a4435)', dot: '#3F6550' },
      { to: '/admin/ai-import', icon: Robot, label: 'AI Import', g: 'linear-gradient(135deg,#B86452,#8D4133)', dot: '#B86452' },
      { to: '/admin/listing-task', icon: List, label: 'Listing Task', g: 'linear-gradient(135deg,#453d36,#2d2722)', dot: '#C98745' },
      { to: '/admin/scout', icon: Target, label: 'Product Scout', g: 'linear-gradient(135deg,#E25726,#B86452)', dot: '#E25726' },
      { to: '/admin/product-research', icon: TrendUp, label: 'Product Research', g: 'linear-gradient(135deg,#C98745,#9e632b)', dot: '#C98745' },
      { to: '/admin/ai-control', icon: Cpu, label: 'AI Control', g: 'linear-gradient(135deg,#3F6550,#2a4435)', dot: '#3F6550' },
      { to: '/admin/ai-intelligence', icon: Sparkle, label: 'AI Intelligence', g: 'linear-gradient(135deg,#B86452,#C98745)', dot: '#B86452' },
    ],
  },
  {
    title: 'System',
    items: [
      { to: '/admin/labels', icon: Truck, label: 'Shipping Labels', g: 'linear-gradient(135deg,#453d36,#2d2722)', dot: '#C98745' },
      { to: '/admin/suppliers', icon: Package, label: 'Suppliers', g: 'linear-gradient(135deg,#453d36,#2d2722)', dot: '#C98745' },
      { to: '/admin/payments', icon: CreditCard, label: 'Payments', g: 'linear-gradient(135deg,#C98745,#9e632b)', dot: '#C98745' },
      { to: '/admin/settings', icon: GearSix, label: 'Settings', g: 'linear-gradient(135deg,#453d36,#2d2722)', dot: '#C98745' },
      { to: '/admin/listing-playbook', icon: BookBookmark, label: 'Listing Playbook', g: 'linear-gradient(135deg,#B86452,#8D4133)', dot: '#B86452' },
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
        mobile ? 'w-full h-full' : 'w-60 fixed inset-y-0 left-0 z-40 hidden lg:flex'
      }`}
      style={{
        background: 'linear-gradient(180deg, #26211C 0%, #1f1a16 55%, #181411 100%)',
        boxShadow: 'inset -1px 0 0 rgba(224,214,200,0.1)',
      }}
    >
      {/* Brand */}
      <div className="px-3.5 py-4 border-b border-[#E0D6C8]/10 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg overflow-hidden border border-[#E0D6C8]/20 shadow-md bg-[#1f1a16] flex items-center justify-center shrink-0">
          <img
            src="/images/hk_salt_crystal.webp"
            alt="Himalayan Koh"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="leading-tight min-w-0">
          <span className="font-bold text-sm text-[#FAF7F1] tracking-tight block truncate">Himalayan Koh</span>
          <span className="text-[9px] uppercase tracking-[0.2em] text-[#C98745] font-semibold">Admin Console</span>
        </div>
        {mobile && (
          <button
            onClick={() => setMobSide(false)}
            className="ml-auto p-1.5 hover:bg-white/10 rounded-lg text-[#b6aba0] hover:text-[#FAF7F1]"
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
            <p className="px-2.5 mb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[#8e8276]">
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
                      isActive ? 'text-[#FAF7F1]' : 'text-[#b6aba0] hover:text-[#FAF7F1] hover:bg-white/[0.05]'
                    }`}
                    style={
                      isActive
                        ? {
                            background: 'rgba(184,100,82,0.15)',
                            boxShadow: 'inset 0 0 0 1px rgba(184,100,82,0.30)',
                          }
                        : undefined
                    }
                  >
                    {isActive && (
                      <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[#E25726]"
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
      <div className="p-2 border-t border-[#E0D6C8]/10 space-y-0.5">
        <Link
          to="/"
          className="flex items-center gap-2 text-[11px] text-[#b6aba0] hover:text-[#FAF7F1] px-2.5 py-1.5 rounded-lg hover:bg-white/[0.05] transition-colors"
        >
          <span className="w-[26px] h-[26px] rounded-md bg-white/[0.05] flex items-center justify-center text-[#C98745]">
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
    <div className="h-screen w-full bg-[#FAF7F1] flex overflow-hidden font-sans">
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

      <div className="flex-1 flex flex-col min-w-0 lg:pl-60 h-screen overflow-hidden">
        {/* Header */}
        <header className="h-14 shrink-0 bg-[#FFFDF8]/95 backdrop-blur-md border-b border-[#E0D6C8] flex items-center justify-between gap-3 px-4 lg:px-6 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobSide(true)}
              className="lg:hidden p-1.5 hover:bg-[#FAF7F1] rounded-lg text-[#26211C]"
              aria-label="Open sidebar"
            >
              <List size={18} />
            </button>
            <form
              onSubmit={handleSearch}
              className="hidden md:flex items-center gap-2 bg-[#FAF7F1] border border-[#E0D6C8] rounded-lg px-3 py-1.5 w-64 focus-within:ring-2 focus-within:ring-[#B86452]/25 focus-within:border-[#B86452]"
            >
              <MagnifyingGlass size={13} className="text-[#6D6258] shrink-0" />
              <input
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                placeholder="Search products…"
                className="bg-transparent text-xs outline-none w-full placeholder:text-[#6D6258] text-[#26211C]"
              />
              <span className="text-[9px] text-[#6D6258] border border-[#E0D6C8] bg-white rounded px-1 py-px font-medium">
                ⌘K
              </span>
            </form>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-medium text-[#3F6550] bg-[#3F6550]/10 border border-[#3F6550]/20 rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3F6550] animate-pulse" />
              Live
            </span>
            <button
              className="relative p-2 hover:bg-[#FAF7F1] rounded-lg text-[#3F6550] hover:text-[#26211C] transition-colors"
              title="System Secure & Verified"
            >
              <ShieldCheck size={16} />
              <span
                className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#C98745]"
              />
            </button>
            <div className="flex items-center gap-2 pl-1.5 border-l border-[#E0D6C8]">
              <span className="text-xs font-medium text-[#26211C] hidden sm:block">{adminName}</span>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-md ring-2 ring-[#E0D6C8]"
                style={{ background: 'linear-gradient(135deg, #B86452, #E25726)' }}
              >
                {adminInitial}
              </div>
            </div>
          </div>
        </header>

        {/* Content Canvas */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto min-w-0 p-3 pb-24 lg:p-5"
          style={{ background: '#FAF7F1' }}
        >
          {children}
        </main>

        {/* Mobile quick navigation */}
        <nav
          className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-[#FFFDF8]/95 backdrop-blur border-t border-[#E0D6C8] shadow-[0_-4px_20px_rgba(38,33,28,0.08)]"
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
                    className="flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-[#6D6258] hover:text-[#26211C] min-h-[52px]"
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
                    on ? 'text-[#B86452] font-semibold' : 'text-[#6D6258] font-medium hover:text-[#26211C]'
                  }`}
                >
                  <span className={`px-3 py-1 rounded-xl ${on ? 'bg-[#B86452]/10 text-[#B86452]' : ''}`}>
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
