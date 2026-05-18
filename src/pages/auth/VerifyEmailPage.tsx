import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Loader2, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase handles the token verification automatically via URL
    // We just need to check if the session is valid
    const checkVerification = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        setStatus('error');
        return;
      }

      if (session) {
        setStatus('success');
        // Redirect to home after 3 seconds
        setTimeout(() => navigate('/'), 3000);
      } else {
        setStatus('error');
      }
    };

    // Small delay to ensure URL params are processed
    setTimeout(checkVerification, 1000);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream via-white to-himalayan-lighter flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-xl shadow-black/5 p-8 max-w-md w-full text-center"
      >
        {status === 'loading' && (
          <>
            <Loader2 size={48} className="animate-spin text-himalayan mx-auto mb-6" />
            <h1 className="font-serif text-2xl font-bold text-charcoal mb-2">
              Verifying Your Email
            </h1>
            <p className="text-charcoal-light">Please wait...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check size={32} className="text-green-600" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-charcoal mb-2">
              Email Verified!
            </h1>
            <p className="text-charcoal-light mb-6">
              Your email has been successfully verified. Redirecting to homepage...
            </p>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-himalayan hover:bg-himalayan-dark text-white font-semibold rounded-xl transition-colors"
            >
              Go to Homepage
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle size={32} className="text-red-600" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-charcoal mb-2">
              Verification Failed
            </h1>
            <p className="text-charcoal-light mb-6">
              The verification link is invalid or has expired. Please try signing up again or contact support.
            </p>
            <div className="space-y-3">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-himalayan hover:bg-himalayan-dark text-white font-semibold rounded-xl transition-colors"
              >
                Sign Up Again
              </Link>
              <Link
                to="/contact"
                className="block text-sm text-charcoal-light hover:text-charcoal"
              >
                Contact Support
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
