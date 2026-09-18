import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { CUSTOMER_HOME } from '../../lib/auth/roleRouting';

interface AdminRouteProps {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { isAuthenticated, loading, isAdmin, profileLoading, profileError } = useAuthContext();
  const location = useLocation();

  // `loading` clears as soon as the session itself is known — before the
  // profiles-table row has actually arrived, by design, so sign-in never
  // looks hung. isAdmin reads that row, so a role-gated route has to wait on
  // it too: checking isAdmin before the profile loads judged a real admin
  // "not admin" from a profile that was simply still in flight.
  if (loading || (isAuthenticated && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-charcoal">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-himalayan mx-auto mb-4" />
          <p className="text-white/70">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  // `from` travels as a query param, not router state — see ProtectedRoute
  // for why the state-based version is unreliable.
  if (!isAuthenticated) {
    return <Navigate to={`/login?from=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // A confirmed-customer, or anyone whose profile could not be read, is sent to
  // their own account page rather than shown an admin-themed dead end: the
  // console is not a place a customer can be, and telling them so in the
  // console's own visual language was the confusion this replaces. When the
  // profile request itself failed (rather than reporting a non-admin role), the
  // verdict is not trustworthy, so it is surfaced on the account page instead
  // of a redirect loop against a role that was never really read.
  if (!isAdmin) {
    const retry = profileError
      ? `?notice=${encodeURIComponent('admin-role-unconfirmed')}`
      : '';
    return <Navigate to={`${CUSTOMER_HOME}${retry}`} replace />;
  }

  return <>{children}</>;
}
