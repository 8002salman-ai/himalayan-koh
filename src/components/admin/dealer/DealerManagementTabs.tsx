import { Link, useLocation } from 'react-router-dom';

const TABS = [
  { label: 'Dashboard', path: '/admin/dealers' },
  { label: 'Applications', path: '/admin/dealers/applications' },
  { label: 'Wholesalers', path: '/admin/dealers/dealers' },
  { label: 'Purchase Requests', path: '/admin/dealers/purchase-requests' },
  { label: 'Wholesale Orders', path: '/admin/dealers/wholesale-orders' },
  { label: 'Wholesale Levels', path: '/admin/dealers/levels' },
  { label: 'Pricing', path: '/admin/dealers/pricing' },
  { label: 'Credit & Finance', path: '/admin/dealers/credit' },
  { label: 'Sales Representatives', path: '/admin/dealers/sales-reps' },
  { label: 'Documents', path: '/admin/dealers/documents' },
  { label: 'Communication', path: '/admin/dealers/communication' },
  { label: 'Reports', path: '/admin/dealers/reports' },
  { label: 'Audit Logs', path: '/admin/dealers/audit' },
  { label: 'Settings', path: '/admin/settings' },
] as const;

export default function DealerManagementTabs() {
  const location = useLocation();

  return (
    <div className="bg-white rounded-2xl shadow-sm p-2 overflow-x-auto scrollbar-thin">
      <div className="flex items-center gap-1 min-w-max">
        {TABS.map((tab) => {
          const isActive =
            tab.path === '/admin/dealers'
              ? location.pathname === '/admin/dealers'
              : location.pathname === tab.path || location.pathname.startsWith(`${tab.path}/`);
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                isActive ? 'bg-himalayan text-white' : 'text-charcoal-light hover:bg-gray-100 hover:text-charcoal'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
