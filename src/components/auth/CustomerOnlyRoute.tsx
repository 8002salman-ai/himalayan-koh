import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';

/**
 * Customer account pages (/orders, etc.) — admins manage the store at /admin/orders.
 */
export default function CustomerOnlyRoute({ children }: { children: React.ReactNode }) {
  const { profile } = useAuthContext();
  const location = useLocation();

  if (profile?.role === 'admin') {
    const orderIdMatch = location.pathname.match(/^\/orders\/([^/]+)$/);
    const target = orderIdMatch
      ? `/admin/orders?orderId=${encodeURIComponent(orderIdMatch[1])}`
      : '/admin/orders';

    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
}
