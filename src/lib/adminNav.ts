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
  Menu,
  BarChart3,
  LayoutGrid,
  Building2,
  Contact,
} from 'lucide-react';
import { publicEnv } from './env';


export const ADMIN_NAV_ITEMS = [
  { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { label: 'Products', path: '/admin/products', icon: Package },
  { label: 'Categories', path: '/admin/categories', icon: FolderTree },
  { label: 'Orders', path: '/admin/orders', icon: ShoppingCart },
  { label: 'Shipping Labels', path: '/admin/labels', icon: Truck },
  { label: 'Customers', path: '/admin/customers', icon: Users },
  { label: 'CRM', path: '/admin/crm', icon: Contact },
  { label: 'Wholesalers', path: '/admin/dealers', icon: Building2 },

  { label: 'Blog Posts', path: '/admin/blog', icon: FileText },
  { label: 'Category Hubs', path: '/admin/category-hubs', icon: LayoutGrid },
  { label: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
  { label: 'Settings', path: '/admin/settings', icon: Settings },
  { label: 'API Keys', path: '/admin/api-keys', icon: KeyRound },
] as const;

export const ADMIN_MOBILE_NAV_ITEMS = [
  { label: 'Home', path: '/admin', icon: LayoutDashboard },
  { label: 'Products', path: '/admin/products', icon: Package },
  { label: 'Orders', path: '/admin/orders', icon: ShoppingCart },
  { label: 'More', path: 'menu', icon: Menu },
] as const;

/**
 * Wholesale/B2B is temporarily disabled — see src/lib/env.ts. The
 * "Wholesalers" admin nav entry is hidden while disabled (not deleted; the
 * route and all underlying data/functionality stay intact for direct/
 * internal access). Single filter point so both AdminLayout.tsx nav
 * renders (desktop sidebar + mobile drawer) stay consistent.
 */
export function getVisibleAdminNavItems() {
  return publicEnv.wholesaleEnabled
    ? ADMIN_NAV_ITEMS
    : ADMIN_NAV_ITEMS.filter((item) => item.path !== '/admin/dealers');
}
