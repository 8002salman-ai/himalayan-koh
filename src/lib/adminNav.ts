import {
  LayoutDashboard,
  Package,
  FolderTree,
  Boxes,
  ShoppingCart,
  Users,
  Ticket,
  FileText,
  LayoutGrid,
  Image,
  Search as SearchIcon,
  Megaphone,
  BarChart3,
  Contact,
  Truck,
  UserCog,
  Settings,
  KeyRound,
  type LucideIcon,
} from 'lucide-react';

/**
 * The admin console's navigation — one owner for its order, grouping and icons.
 *
 * Grouped rather than flat: thirteen destinations in a single column is what
 * made the old sidebar read as a list of links instead of a console. Groups are
 * the Luxedge taxonomy (Overview / Commerce / Content / Growth / System).
 *
 * There is deliberately no mobile navigation list. The admin is a desktop tool
 * (see `ADMIN_CANVAS_MIN_WIDTH`), so the shell renders this rail at every
 * viewport instead of swapping to a drawer, bottom bar or hamburger.
 */

export interface AdminNavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  /** True when the section is built but its backend is not connected yet. */
  pending?: boolean;
}

export interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', path: '/admin', icon: LayoutDashboard }],
  },
  {
    label: 'Commerce',
    items: [
      { label: 'Products', path: '/admin/products', icon: Package },
      { label: 'Categories', path: '/admin/categories', icon: FolderTree },
      { label: 'Inventory', path: '/admin/inventory', icon: Boxes, pending: true },
      { label: 'Orders', path: '/admin/orders', icon: ShoppingCart },
      { label: 'Customers', path: '/admin/customers', icon: Users },
      { label: 'Coupons', path: '/admin/coupons', icon: Ticket, pending: true },
    ],
  },
  {
    label: 'Content',
    items: [
      { label: 'Blog Posts', path: '/admin/blog', icon: FileText },
      { label: 'Category Hubs', path: '/admin/category-hubs', icon: LayoutGrid },
      { label: 'Media', path: '/admin/media', icon: Image, pending: true },
    ],
  },
  {
    label: 'Growth',
    items: [
      { label: 'SEO', path: '/admin/seo', icon: SearchIcon },
      { label: 'Marketing', path: '/admin/marketing', icon: Megaphone, pending: true },
      { label: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
      { label: 'CRM', path: '/admin/crm', icon: Contact },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Shipping Labels', path: '/admin/labels', icon: Truck },
      { label: 'Users & Roles', path: '/admin/users', icon: UserCog },
      { label: 'Settings', path: '/admin/settings', icon: Settings },
      { label: 'API Keys', path: '/admin/api-keys', icon: KeyRound },
    ],
  },
];

const NAV_ITEMS = ADMIN_NAV_GROUPS.flatMap((group) => group.items);

/** The nav entry that owns a path — used for the console's breadcrumb. */
export function findAdminNavItem(pathname: string): AdminNavItem | undefined {
  return (
    NAV_ITEMS.find((item) => item.path === pathname) ??
    NAV_ITEMS.filter((item) => item.path !== '/admin').find((item) =>
      pathname.startsWith(`${item.path}/`)
    )
  );
}
