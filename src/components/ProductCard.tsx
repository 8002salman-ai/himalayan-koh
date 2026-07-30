import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingCart, Heart, Eye } from 'lucide-react';
import { Product } from '../data/products';
import { useCart } from '../store/cartStore';
import { useAuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { wishlistApi } from '../lib/supabase/api';
import { isSupabaseConfigured } from '../lib/supabase/client';

interface Props {
  product: Product;
  index: number;
  onQuickView?: (product: Product) => void;
  /** Category hub left column — stronger shop affordance */
  shopHighlight?: boolean;
}

export default function ProductCard({ product, index, onQuickView, shopHighlight }: Props) {
  const [qty, setQty] = useState(1);
  const [selectedGrain, setSelectedGrain] = useState(product.grainSizes?.[0] || '');
  const [wishlisted, setWishlisted] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const { addItem } = useCart();
  const { user } = useAuthContext();
  const toast = useToast();

  const handleAddToCart = async () => {
    try {
      await addItem({
        id: String(product.id),
        name: product.name,
        price: product.priceMin,
        image: product.image,
        grainSize: selectedGrain || undefined,
      }, qty);
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2000);
    } catch {
      toast.error('Failed to add item to cart. Please try again.');
    }
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
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.06, 0.3) }}
      className={`group bg-white rounded-2xl overflow-hidden transition-all duration-500 ${
        shopHighlight
          ? 'shadow-md shadow-himalayan/10 border border-himalayan/15 hover:shadow-xl hover:shadow-himalayan/20 hover:border-himalayan/35'
          : 'shadow-md shadow-black/5 hover:shadow-xl hover:shadow-himalayan/10'
      }`}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        <Link to={`/products/${product.slug}`} className="block w-full h-full">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).src = '/images/placeholder-product.svg'; }}
          />
        </Link>

        {/* Overlay buttons */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onQuickView?.(product)}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-himalayan hover:text-white transition-colors"
            aria-label="Quick view"
          >
            <Eye size={18} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleWishlist}
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-colors ${
              wishlisted ? 'bg-himalayan text-white' : 'bg-white hover:bg-himalayan hover:text-white'
            }`}
          >
            <Heart size={18} fill={wishlisted ? 'currentColor' : 'none'} />
          </motion.button>
        </div>

        {/* Badge — shown only when the product is explicitly featured */}
        {product.isFeatured && (
          <div className="absolute top-3 left-3 px-3 py-1 bg-himalayan text-white text-xs font-bold rounded-full">
            Featured
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3.5 md:p-4">
        <h3 className="font-semibold text-charcoal text-sm leading-snug line-clamp-2 mb-1.5 min-h-10">
          <Link
            to={`/products/${product.slug}`}
            className="group-hover:text-himalayan transition-colors"
          >
            {product.name}
          </Link>
        </h3>

        <p className="text-himalayan font-bold text-base mb-2.5">
          {product.price}
        </p>

        {/* Grain Size Selector */}
        {product.grainSizes && product.grainSizes.length > 0 && (
          <select
            value={selectedGrain}
            onChange={(e) => setSelectedGrain(e.target.value)}
            className="w-full mb-2.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan transition-all"
          >
            {product.grainSizes.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        )}

        {/* Quantity + Add to Cart */}
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setQty(Math.max(1, qty - 1))}
              className="px-3 py-2 text-sm hover:bg-gray-100 transition-colors font-semibold text-charcoal"
            >
              −
            </button>
            <span className="px-3 py-2 text-sm font-semibold min-w-[2rem] text-center border-x border-gray-200 text-charcoal">
              {qty}
            </span>
            <button
              onClick={() => setQty(qty + 1)}
              className="px-3 py-2 text-sm hover:bg-gray-100 transition-colors font-semibold text-charcoal"
            >
              +
            </button>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleAddToCart}
            className={`flex-1 flex items-center justify-center gap-2 min-h-11 rounded-xl font-semibold text-sm transition-all duration-300 ${
              addedToCart
                ? 'bg-himalayan-green text-white'
                : 'bg-himalayan hover:bg-himalayan-dark text-white'
            }`}
          >
            <ShoppingCart size={16} />
            {addedToCart ? 'Added!' : 'Add to Cart'}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
