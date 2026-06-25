import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../store/cartStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: Props) {
  const { items, removeItem, updateQuantity, totalItems, totalPrice, clearCart } = useCart();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-drawer-backdrop bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-drawer w-full max-w-md bg-white shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <ShoppingBag size={22} className="text-himalayan" />
                <h2 className="font-serif text-xl font-bold text-charcoal">
                  Your Cart ({totalItems})
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-5">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <ShoppingBag size={56} className="text-gray-200 mb-4" />
                  <h3 className="font-serif text-xl font-bold text-charcoal mb-2">Your cart is empty</h3>
                  <p className="text-charcoal-light text-sm mb-6">Add some premium Himalayan salt products!</p>
                  <button
                    onClick={onClose}
                    className="px-6 py-3 bg-himalayan text-white rounded-xl font-semibold hover:bg-himalayan-dark transition-colors"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <motion.div
                      key={`${item.id}-${item.grainSize}`}
                      layout
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      className="flex gap-4 p-3 bg-gray-50 rounded-xl"
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/images/placeholder-product.svg'; }}
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-charcoal text-sm leading-snug line-clamp-2 mb-1">
                          {item.name}
                        </h4>
                        {item.grainSize && (
                          <p className="text-xs text-charcoal-light mb-1">{item.grainSize}</p>
                        )}
                        <p className="text-himalayan font-bold text-sm">
                          ${item.price.toFixed(2)}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1, item.grainSize)}
                              className="p-1.5 hover:bg-gray-100 transition-colors"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="px-3 text-sm font-medium">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1, item.grainSize)}
                              className="p-1.5 hover:bg-gray-100 transition-colors"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <button
                            onClick={() => removeItem(item.id, item.grainSize)}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-gray-100 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-charcoal-light">Subtotal</span>
                  <span className="font-bold text-xl text-charcoal">${totalPrice.toFixed(2)}</span>
                </div>
                <p className="text-xs text-charcoal-light">Shipping calculated at checkout</p>
                <Link
                  to="/checkout"
                  onClick={onClose}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-himalayan hover:bg-himalayan-dark text-white font-semibold rounded-xl transition-colors shadow-lg shadow-himalayan/25"
                >
                  Proceed to Checkout
                  <ArrowRight size={18} />
                </Link>
                <button
                  onClick={clearCart}
                  className="w-full py-2 text-sm text-charcoal-light hover:text-red-500 transition-colors"
                >
                  Clear Cart
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
