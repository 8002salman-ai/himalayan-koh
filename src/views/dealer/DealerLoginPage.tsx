import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { isSupabaseConfigured } from '../../lib/supabase/client';

export default function DealerLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signIn, isAuthenticated } = useAuthContext();
  const navigate = useNavigate();
  const supabaseReady = isSupabaseConfigured();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dealer/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

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
    <div className="min-h-screen bg-gradient-to-br from-charcoal via-charcoal to-charcoal-light flex items-start sm:items-center justify-center px-4 py-8 sm:py-0">
      <div className="w-full max-w-md">
        <Link
          to="/dealer"
          className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft size={18} />
          Back to Dealer Program
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl shadow-black/20 p-6 sm:p-8"
        >
          <div className="text-center mb-8">
            <img src="/logo.svg" alt="Himalayan Koh" className="h-14 mx-auto mb-4" />
            <span className="inline-block px-3 py-1 bg-himalayan-lighter text-himalayan text-xs font-semibold tracking-wider uppercase rounded-full mb-3">
              Dealer Portal
            </span>
            <h1 className="font-serif text-2xl font-bold text-charcoal">Dealer Sign In</h1>
            <p className="text-charcoal-light text-sm mt-1">Sign in to manage orders and dealer pricing</p>
          </div>

          {!supabaseReady && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              Supabase is not configured. Dealer login will work once environment variables are set.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
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
              <label className="block text-sm font-medium text-charcoal mb-1.5">Business Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-charcoal focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
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
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-4 bg-himalayan hover:bg-himalayan-dark text-white font-semibold rounded-xl transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-himalayan/25"
            >
              {isSubmitting && <Loader2 size={18} className="animate-spin" />}
              Sign In
            </motion.button>
          </form>

          <p className="text-center text-sm text-charcoal-light mt-6">
            Not a dealer yet?{' '}
            <Link to="/dealer/register" className="text-himalayan font-semibold hover:underline">
              Apply to become a dealer
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
