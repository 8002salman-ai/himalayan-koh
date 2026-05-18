import { Link, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';

interface AdminRouteProps {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { isAuthenticated, loading, isAdmin } = useAuthContext();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-charcoal">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-himalayan mx-auto mb-4" />
          <p className="text-white/70">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
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
            This area is restricted to administrators only. Please contact support if you believe this is an error.
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
