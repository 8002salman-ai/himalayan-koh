import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, LogIn, Home } from 'lucide-react';

export default function DealerSignedOut() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-charcoal via-charcoal to-charcoal-light flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-2xl shadow-black/30 p-8 text-center"
        >
          <img src="/logo.svg" alt="Himalayan Koh" className="h-12 mx-auto mb-6" />

          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 text-green-500" />
            </div>
          </div>

          <h1 className="font-serif text-2xl font-bold text-charcoal">You&apos;ve been signed out</h1>
          <p className="text-charcoal-light text-sm mt-2 mb-8">
            Your wholesale session has ended and you&apos;ve been securely signed out of your account.
          </p>

          <div className="space-y-3">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => navigate('/dealer/login')}
              className="w-full flex items-center justify-center gap-2 py-4 bg-himalayan hover:bg-himalayan-dark text-white font-semibold rounded-xl transition-colors shadow-lg shadow-himalayan/25"
            >
              <LogIn size={18} />
              Sign in again
            </motion.button>

            <Link
              to="/"
              className="w-full flex items-center justify-center gap-2 py-3.5 border border-gray-200 text-charcoal font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              <Home size={18} />
              Back to home
            </Link>
          </div>
        </motion.div>

        <p className="text-center text-white/40 text-xs mt-6">
          Thank you for partnering with Himalayan Koh.
        </p>
      </div>
    </div>
  );
}
