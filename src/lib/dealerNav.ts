import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Receipt,
  FileBarChart,
  User,
  FolderOpen,
  LifeBuoy,
  Menu,
} from 'lucide-react';

export const DEALER_NAV_ITEMS = [
  { label: 'Dashboard', path: '/dealer/dashboard', icon: LayoutDashboard },
  { label: 'Products', path: '/dealer/products', icon: Package },
  { label: 'Orders', path: '/dealer/orders', icon: ShoppingCart },
  { label: 'Invoices', path: '/dealer/invoices', icon: Receipt },
  { label: 'Statements', path: '/dealer/statements', icon: FileBarChart },
  { label: 'Documents', path: '/dealer/documents', icon: FolderOpen },
  { label: 'Profile', path: '/dealer/profile', icon: User },
  { label: 'Support', path: '/dealer/support', icon: LifeBuoy },
] as const;

export const DEALER_MOBILE_NAV_ITEMS = [
  { label: 'Home', path: '/dealer/dashboard', icon: LayoutDashboard },
  { label: 'Products', path: '/dealer/products', icon: Package },
  { label: 'Orders', path: '/dealer/orders', icon: ShoppingCart },
  { label: 'More', path: 'menu', icon: Menu },
] as const;
