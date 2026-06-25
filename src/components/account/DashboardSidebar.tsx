import { Link, useLocation } from 'react-router-dom';
import { Bell, Heart, LayoutDashboard, MapPin, Package, Shield, User, BarChart3, ShoppingBag, Truck } from 'lucide-react';
import type { Profile } from '../../lib/supabase/database.types';
import type { User as SupabaseUser } from '@supabase/supabase-js';

const customerNavItems = [
  { label: 'Dashboard', path: '/account', icon: LayoutDashboard },
  { label: 'My Purchases', path: '/orders', icon: Package },
  { label: 'Track a Package', path: '/track', icon: Truck },
  { label: 'Wishlist', path: '/wishlist', icon: Heart },
  { label: 'Addresses', path: '/account?tab=addresses', icon: MapPin },
  { label: 'Notifications', path: '/account?tab=notifications', icon: Bell },
  { label: 'Settings', path: '/account?tab=profile', icon: Shield },
];

const adminNavItems = [
  { label: 'Admin Dashboard', path: '/admin', icon: BarChart3 },
  { label: 'Manage Store Orders', path: '/admin/orders', icon: ShoppingBag },
  { label: 'Track Order Lookup', path: '/track', icon: Truck },
  { label: 'Account Settings', path: '/account?tab=profile', icon: Shield },
];

interface DashboardSidebarProps {
  profile: Profile | null;
  user: SupabaseUser | null;
}

export default function DashboardSidebar({ profile, user }: DashboardSidebarProps) {
  const location = useLocation();
  const currentPath = `${location.pathname}${location.search}`;
  const isAdmin = profile?.role === 'admin';
  const navItems = isAdmin ? adminNavItems : customerNavItems;

  return (
    <div className="lg:col-span-1">
      <div className="bg-white rounded-2xl p-6 shadow-md mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-himalayan-lighter flex items-center justify-center overflow-hidden">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name || 'User'}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User size={24} className="text-himalayan" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-charcoal truncate">
              {profile?.full_name || (isAdmin ? 'Administrator' : 'Customer')}
            </h3>
            <p className="text-sm text-charcoal-light truncate">{user?.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 bg-himalayan-lighter text-himalayan text-xs font-medium rounded-full capitalize">
              {profile?.role || 'customer'}
            </span>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">Administrator account</p>
          <p className="mt-1 text-amber-900/90">
            Customer orders, labels, and payments are managed under{' '}
            <Link to="/admin/orders" className="font-semibold text-himalayan hover:underline">
              Manage Store Orders
            </Link>
            .
          </p>
        </div>
      )}

      <nav className="bg-white rounded-2xl p-3 shadow-md space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.path === '/account'
              ? location.pathname === '/account' && !location.search
              : currentPath === item.path ||
                (item.path === '/orders' && location.pathname.startsWith('/orders')) ||
                (item.path === '/admin/orders' && location.pathname.startsWith('/admin/orders'));

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                isActive ? 'bg-himalayan text-white' : 'text-charcoal hover:bg-gray-50'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
