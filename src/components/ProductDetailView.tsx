import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, Heart, Star, Check, Minus, Plus, ChevronRight } from 'lucide-react';
import type { Product } from '../data/products';
import { useCart } from '../store/cartStore';
import { useAuthContext } from '../context/AuthContext';
import { wishlistApi } from '../lib/supabase/api';
import { isSupabaseConfigured } from '../lib/supabase/client';

interface ProductDetailViewProps {
  product: Product;
  variant?: 'page' | 'modal';
  onClose?: () => void;
}

export default function ProductDetailView({
  product,
  variant = 'page',
  onClose,
}: ProductDetailViewProps) {
  const [qty, setQty] = useState(1);
  const [selectedGrain, setSelectedGrain] = useState(product.grainSizes?.[0] || '');
  const [addedToCart, setAddedToCart] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const { addItem } = useCart();
  const { user } = useAuthContext();

  useEffect(() => {
    setQty(1);
    setSelectedGrain(product.grainSizes?.[0] || '');
    setAddedToCart(false);
  }, [product.id, product.grainSizes]);

  const handleAddToCart = async () => {
    await addItem(
      {
        id: String(product.id),
        name: product.name,
        price: product.priceMin,
        image: product.image,
        grainSize: selectedGrain || undefined,
      },
      qty
    );
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleWishlist = async () => {
    if (!user?.id || !isSupabaseConfigured()) {
      setWishlisted(!wishlisted);
      return;
    }

    const nextState = await wishlistApi.toggleWishlist(user.id, String(product.id));
    setWishlisted(nextState);
  };

  const details = (
    <motion.div
      layout
      className={
        variant === 'modal'
          ? 'bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl'
          : 'bg-white rounded-3xl shadow-lg overflow-hidden'
      }
      onClick={variant === 'modal' ? (e) => e.stopPropagation() : undefined}
    >
      {variant === 'page' && (
        <nav className="px-6 py-4 border-b border-gray-100 text-sm text-charcoal-light" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1">
            <li>
              <Link to="/" className="hover:text-himalayan transition-colors">
                Home
              </Link>
            </li>
            <ChevronRight size={14} className="mx-0.5 shrink-0" />
            <li>
              <Link to="/products" className="hover:text-himalayan transition-colors">
                Products
              </Link>
            </li>
            <ChevronRight size={14} className="mx-0.5 shrink-0" />
            <li className="text-charcoal font-medium line-clamp-1">{product.name}</li>
          </ol>
        </nav>
      )}

      <div className="grid md:grid-cols-2 gap-0">
        <div className="relative aspect-square md:aspect-auto bg-gray-50 min-h-[280px]">
          <img
            src={product.image}
            alt={product.name}
            className={`w-full h-full object-cover ${variant === 'modal' ? 'md:rounded-l-3xl' : ''}`}
          />
          {variant === 'modal' && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 md:hidden w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <div className="p-6 md:p-8 relative">
          {variant === 'modal' && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="hidden md:flex absolute top-4 right-4 w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full items-center justify-center transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          )}

          <p className="text-xs font-bold uppercase tracking-wider text-himalayan mb-2">
            {product.category}
          </p>

          <div className="flex items-center gap-1 mb-3">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={16} className="text-amber-400 fill-amber-400" />
            ))}
          </div>

          <h1 className="font-serif text-xl md:text-2xl font-bold text-charcoal mb-3 leading-snug pr-8">
            {product.name}
          </h1>

          <p className="text-himalayan font-bold text-2xl mb-4">{product.price}</p>

          {!product.inStock && (
            <p className="text-sm font-semibold text-red-600 mb-4">Currently out of stock</p>
          )}

          {product.description && (
            <p className="text-charcoal-light text-sm leading-relaxed mb-5">{product.description}</p>
          )}

          <div className="space-y-2 mb-5">
            {['100% Natural & Pure', 'Rich in 84+ Minerals', 'Free Shipping on $50+'].map((feat) => (
              <div key={feat} className="flex items-center gap-2 text-sm text-charcoal">
                <Check size={16} className="text-green-500 flex-shrink-0" />
                {feat}
              </div>
            ))}
          </div>

          {product.grainSizes && product.grainSizes.length > 0 && (
            <div className="mb-5">
              <label className="block text-sm font-semibold text-charcoal mb-2">Grain Size</label>
              <div className="flex flex-wrap gap-2">
                {product.grainSizes.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setSelectedGrain(g)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                      selectedGrain === g
                        ? 'border-himalayan bg-himalayan/10 text-himalayan'
                        : 'border-gray-200 text-charcoal hover:border-himalayan/50'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mb-5">
            <label className="block text-sm font-semibold text-charcoal mb-2">Quantity</label>
            <div className="inline-flex items-center border border-gray-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="px-4 py-3 hover:bg-gray-100 transition-colors"
                aria-label="Decrease quantity"
              >
                <Minus size={16} />
              </button>
              <span className="px-5 py-3 font-semibold min-w-[3rem] text-center border-x border-gray-200">
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty(qty + 1)}
                className="px-4 py-3 hover:bg-gray-100 transition-colors"
                aria-label="Increase quantity"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAddToCart}
              disabled={!product.inStock}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                addedToCart
                  ? 'bg-green-500 text-white'
                  : 'bg-himalayan hover:bg-himalayan-dark text-white shadow-lg shadow-himalayan/25'
              }`}
            >
              <ShoppingCart size={18} />
              {addedToCart ? 'Added to Cart!' : 'Add to Cart'}
            </motion.button>
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleWishlist}
              className="w-14 h-14 border-2 border-gray-200 rounded-xl flex items-center justify-center hover:border-himalayan hover:text-himalayan transition-colors"
              aria-label="Add to wishlist"
            >
              <Heart size={20} fill={wishlisted ? 'currentColor' : 'none'} />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );

  if (variant === 'modal') {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          {details}
        </motion.div>
      </AnimatePresence>
    );
  }

  return details;
}
