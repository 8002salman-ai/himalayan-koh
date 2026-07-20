import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Clock, ShieldAlert, ClipboardEdit, XCircle } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { dealerApi } from '../../lib/supabase/api';
import { isSupabaseConfigured } from '../../lib/supabase/client';
import type { DealerApplicationWithDocuments } from '../../lib/supabase/database.types';

interface DealerRouteProps {
  children: React.ReactNode;
}

const statusGate: Record<
  Exclude<DealerApplicationWithDocuments['status'], 'approved'>,
  { icon: React.ReactNode; title: string; body: string }
> = {
  pending: {
    icon: <Clock size={40} />,
    title: 'Application received',
    body: "Thanks for applying. Our team is reviewing your wholesale application — we'll email you once a decision is made.",
  },
  under_review: {
    icon: <Clock size={40} />,
    title: 'Application under review',
    body: "Your wholesale application is currently being reviewed by our team. We'll follow up shortly.",
  },
  need_more_info: {
    icon: <ClipboardEdit size={40} />,
    title: 'More information needed',
    body: 'Our team needs a bit more information before we can approve your wholesale account. Please check your email or contact support.',
  },
  rejected: {
    icon: <XCircle size={40} />,
    title: 'Application not approved',
    body: 'Unfortunately your wholesale application was not approved. Contact support if you have questions.',
  },
  suspended: {
    icon: <ShieldAlert size={40} />,
    title: 'Account suspended',
    body: 'Your wholesale account is currently suspended. Please contact our support team for details.',
  },
};

export default function DealerRoute({ children }: DealerRouteProps) {
  const { isAuthenticated, loading, user, signOut } = useAuthContext();
  const location = useLocation();
  const navigate = useNavigate();

  const handleGateSignOut = async () => {
    await signOut();
    navigate('/dealer/signed-out');
  };
  const [checking, setChecking] = useState(true);
  const [application, setApplication] = useState<DealerApplicationWithDocuments | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!isAuthenticated || !user?.id || !isSupabaseConfigured()) {
      setChecking(false);
      return;
    }

    setChecking(true);
    dealerApi
      .getMyApplication(user.id)
      .then((result) => {
        if (!cancelled) setApplication(result);
      })
      .catch(() => {
        if (!cancelled) setApplication(null);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id]);

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-charcoal">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-himalayan mx-auto mb-4" />
          <p className="text-white/70">Loading wholesale portal...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/dealer/login" state={{ from: location.pathname }} replace />;
  }

  if (!application) {
    return <Navigate to="/dealer/register" replace />;
  }

  if (application.status !== 'approved') {
    const gate = statusGate[application.status];
    return (
      <div className="min-h-screen flex items-center justify-center bg-charcoal p-4">
        <div className="text-center max-w-md">
          <div className="text-himalayan flex justify-center mb-4">{gate.icon}</div>
          <h1 className="font-serif text-2xl font-bold text-white mb-2">{gate.title}</h1>
          <p className="text-white/70 mb-6">{gate.body}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center px-6 py-3 bg-himalayan hover:bg-himalayan-dark text-white font-semibold rounded-xl transition-colors"
            >
              Back to Site
            </Link>
            <button
              type="button"
              onClick={handleGateSignOut}
              className="inline-flex items-center justify-center px-6 py-3 border border-white/20 text-white font-semibold rounded-xl hover:bg-white/10 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
