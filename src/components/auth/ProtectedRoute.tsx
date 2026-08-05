import { Link, Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'customer';
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, loading, profile, profileLoading } = useAuthContext();
  const location = useLocation();

  // Show loading state while checking auth. A role check reads `profile`,
  // which can still be in flight even after `loading` clears (see
  // AuthContext/AdminRoute) — wait for it too, or a real match could briefly
  // render as Access Denied before self-correcting.
  if (loading || (isAuthenticated && requiredRole && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm-white">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-himalayan mx-auto mb-4" />
          <p className="text-charcoal-light">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Check role if required
  if (requiredRole && profile?.role !== requiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm-white p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="font-serif text-2xl font-bold text-charcoal mb-2">
            Access Denied
          </h1>
          <p className="text-charcoal-light mb-6">
            You don&apos;t have permission to access this page. This area is restricted to {requiredRole}s only.
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-himalayan hover:bg-himalayan-dark text-white font-semibold rounded-xl transition-colors"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
