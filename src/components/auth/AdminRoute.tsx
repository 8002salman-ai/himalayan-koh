import { Link, Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';

interface AdminRouteProps {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { isAuthenticated, loading, isAdmin, profileLoading, profileError, refreshProfile } = useAuthContext();
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

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-charcoal p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🛡️</div>
          <h1 className="font-serif text-2xl font-bold text-white mb-2">
            Admin Access Required
          </h1>
          <p className="text-white/70 mb-6">
            {profileError
              ? "We couldn't confirm your admin access — your profile failed to load. This is usually temporary."
              : 'This area is restricted to administrators only. Please contact support if you believe this is an error.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {profileError && (
              <button
                type="button"
                onClick={() => void refreshProfile()}
                className="inline-flex items-center justify-center px-6 py-3 bg-himalayan hover:bg-himalayan-dark text-white font-semibold rounded-xl transition-colors"
              >
                Try again
              </button>
            )}
            <Link
              to="/"
              className="inline-flex items-center justify-center px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-colors"
            >
              Go to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
