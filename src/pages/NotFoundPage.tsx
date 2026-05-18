import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-[60vh] bg-warm-white flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <span className="inline-block px-4 py-1.5 bg-himalayan-lighter text-himalayan text-sm font-semibold tracking-wider uppercase rounded-full mb-4">
          Page Not Found
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-charcoal mb-4">
          We could not find that page
        </h1>
        <p className="text-charcoal-light mb-6">
          The page may have moved, or the link may no longer be active.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-himalayan hover:bg-himalayan-dark text-white font-semibold rounded-xl transition-colors"
        >
          <ArrowLeft size={18} />
          Back to Homepage
        </Link>
      </motion.div>
    </div>
  );
}
