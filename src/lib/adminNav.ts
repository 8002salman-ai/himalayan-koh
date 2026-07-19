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


export const ADMIN_NAV_ITEMS = [
  { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { label: 'Products', path: '/admin/products', icon: Package },
  { label: 'Categories', path: '/admin/categories', icon: FolderTree },
  { label: 'Orders', path: '/admin/orders', icon: ShoppingCart },
  { label: 'Shipping Labels', path: '/admin/labels', icon: Truck },
  { label: 'Customers', path: '/admin/customers', icon: Users },
  { label: 'CRM', path: '/admin/crm', icon: Contact },
  { label: 'Dealers', path: '/admin/dealers', icon: Building2 },

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
