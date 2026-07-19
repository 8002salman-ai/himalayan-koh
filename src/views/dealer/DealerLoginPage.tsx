import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { dealerApi } from '../../lib/supabase/api';
import { isSupabaseConfigured } from '../../lib/supabase/client';

export default function DealerLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signIn, isAuthenticated, user, loading } = useAuthContext();
  const navigate = useNavigate();
  const supabaseReady = isSupabaseConfigured();

  useEffect(() => {
    // Only skip straight to the portal if whoever is already signed in has
    // a wholesale application on file — DealerRoute then routes them to the
    // right place (dashboard / pending / rejected / suspended). If there is
    // no application at all, the signed-in session belongs to a non-wholesale
    // account (e.g. a customer or admin still logged in from browsing the
    // storefront), so this must fall through to the login form instead of
    // bouncing that unrelated session into /dealer/register.
    if (loading || !isAuthenticated || !user?.id || !supabaseReady) return;

    let cancelled = false;
    dealerApi
      .getMyApplication(user.id)
      .then((application) => {
        if (!cancelled && application) {
          navigate('/dealer/dashboard', { replace: true });
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [loading, isAuthenticated, user?.id, supabaseReady, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      await signIn({ email, password });
      navigate('/dealer/dashboard', { replace: true });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-charcoal via-charcoal to-charcoal-light flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link
          to="/dealer"
          className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-8 text-sm transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-2xl shadow-black/30 p-8"
        >
          <div className="text-center mb-8">
            <img src="/logo.svg" alt="Himalayan Koh" className="h-12 mx-auto mb-5" />
            <h1 className="font-serif text-2xl font-bold text-charcoal">Wholesale Sign In</h1>
            <p className="text-charcoal-light text-sm mt-1.5">Access your wholesale account</p>
          </div>

          {!supabaseReady && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              Sign in is temporarily unavailable. Please try again shortly.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm"
              >
                {formError}
              </motion.div>
            )}

            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-charcoal focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan transition-all"
                  placeholder="you@business.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-charcoal focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="text-right">
              <Link to="/forgot-password" className="text-sm text-himalayan hover:underline font-medium">
                Forgot password?
              </Link>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={isSubmitting || !supabaseReady}
              className="w-full flex items-center justify-center gap-2 py-4 bg-himalayan hover:bg-himalayan-dark text-white font-semibold rounded-xl transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-himalayan/25"
            >
              {isSubmitting && <Loader2 size={18} className="animate-spin" />}
              Sign In
            </motion.button>
          </form>

          <p className="text-center text-sm text-charcoal-light mt-6">
            New here?{' '}
            <Link to="/dealer/register" className="text-himalayan font-semibold hover:underline">
              Apply for a wholesale account
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
