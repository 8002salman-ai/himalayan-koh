import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, Heart, Star, Check, Minus, Plus } from 'lucide-react';
import { Product } from '../data/products';
import { useCart } from '../store/cartStore';
import { useAuthContext } from '../context/AuthContext';
import { wishlistApi } from '../lib/supabase/api';
import { isSupabaseConfigured } from '../lib/supabase/client';

interface Props {
  product: Product | null;
  onClose: () => void;
}

export default function ProductModal({ product, onClose }: Props) {
  const [qty, setQty] = useState(1);
  const [selectedGrain, setSelectedGrain] = useState(product?.grainSizes?.[0] || '');
  const [addedToCart, setAddedToCart] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const { addItem } = useCart();
  const { user } = useAuthContext();

  if (!product) return null;

  const handleAddToCart = async () => {
    await addItem({
      id: String(product.id),
      name: product.name,
      price: product.priceMin,
      image: product.image,
      grainSize: selectedGrain || undefined,
    }, qty);
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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          transition={{ type: 'spring', damping: 25 }}
          className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid md:grid-cols-2 gap-0">
            {/* Image */}
            <div className="relative aspect-square md:aspect-auto bg-gray-50">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover md:rounded-l-3xl"
              />
              <button
                onClick={onClose}
                className="absolute top-4 right-4 md:hidden w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Details */}
            <div className="p-6 md:p-8 relative">
              <button
                onClick={onClose}
                className="hidden md:flex absolute top-4 right-4 w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} className="text-amber-400 fill-amber-400" />
                ))}
                <span className="text-sm text-gray-400 ml-2">(4.9 · 47 reviews)</span>
              </div>

              <h2 className="font-serif text-xl md:text-2xl font-bold text-charcoal mb-3 leading-snug">
                {product.name}
              </h2>

              <p className="text-himalayan font-bold text-2xl mb-4">
                {product.price}
              </p>

              {product.description && (
                <p className="text-charcoal-light text-sm leading-relaxed mb-5">
                  {product.description}
                </p>
              )}

              {/* Features */}
              <div className="space-y-2 mb-5">
                {['100% Natural & Pure', 'Rich in 84+ Minerals', 'Free Shipping on $50+'].map((feat) => (
                  <div key={feat} className="flex items-center gap-2 text-sm text-charcoal">
                    <Check size={16} className="text-green-500 flex-shrink-0" />
                    {feat}
                  </div>
                ))}
              </div>

              {/* Grain Size */}
              {product.grainSizes && (
                <div className="mb-5">
                  <label className="block text-sm font-semibold text-charcoal mb-2">Grain Size</label>
                  <div className="flex flex-wrap gap-2">
                    {product.grainSizes.map((g) => (
                      <button
                        key={g}
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

              {/* Quantity */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-charcoal mb-2">Quantity</label>
                <div className="inline-flex items-center border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="px-4 py-3 hover:bg-gray-100 transition-colors"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="px-5 py-3 font-semibold min-w-[3rem] text-center border-x border-gray-200">
                    {qty}
                  </span>
                  <button
                    onClick={() => setQty(qty + 1)}
                    className="px-4 py-3 hover:bg-gray-100 transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAddToCart}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold transition-all duration-300 ${
                    addedToCart
                      ? 'bg-green-500 text-white'
                      : 'bg-himalayan hover:bg-himalayan-dark text-white shadow-lg shadow-himalayan/25'
                  }`}
                >
                  <ShoppingCart size={18} />
                  {addedToCart ? 'Added to Cart!' : 'Add to Cart'}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleWishlist}
                  className="w-14 h-14 border-2 border-gray-200 rounded-xl flex items-center justify-center hover:border-himalayan hover:text-himalayan transition-colors"
                >
                  <Heart size={20} fill={wishlisted ? 'currentColor' : 'none'} />
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
