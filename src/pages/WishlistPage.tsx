import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, ShoppingBag } from 'lucide-react';

export default function WishlistPage() {
  return (
    <div className="min-h-screen bg-warm-white">
      <div className="bg-gradient-to-r from-charcoal to-charcoal-light py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block px-4 py-1.5 bg-himalayan/20 text-himalayan text-sm font-semibold tracking-wider uppercase rounded-full mb-4"
          >
            Wishlist
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4"
          >
            Saved Products
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-white/70 text-lg max-w-2xl mx-auto"
          >
            Keep track of Himalayan Koh products you want to revisit.
          </motion.p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-md p-12 text-center"
        >
          <Heart size={64} className="mx-auto mb-6 text-gray-200" />
          <h2 className="font-serif text-2xl font-bold text-charcoal mb-2">
            No Saved Products Yet
          </h2>
          <p className="text-charcoal-light mb-6">
            Products you save will appear here when wishlist storage is connected.
          </p>
          <Link
            to="/products"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-himalayan hover:bg-himalayan-dark text-white font-semibold rounded-xl transition-colors"
          >
            <ShoppingBag size={18} />
            Browse Products
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
