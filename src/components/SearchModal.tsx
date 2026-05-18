import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { products } from '../data/products';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: Props) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return products.filter((p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.category.toLowerCase().includes(query.toLowerCase())
    );
  }, [query]);

  const handleProductClick = () => {
    onClose();
    navigate('/products');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 md:pt-32 px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25 }}
            className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 p-5 border-b border-gray-100">
              <Search size={22} className="text-gray-400 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search products, categories..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 text-lg text-charcoal placeholder:text-gray-300 focus:outline-none"
              />
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-[400px] overflow-y-auto">
              {query.trim() && results.length === 0 && (
                <div className="p-8 text-center text-charcoal-light">
                  No products found for "{query}"
                </div>
              )}
              {results.map((product) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-50 last:border-0"
                  onClick={handleProductClick}
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-14 h-14 object-cover rounded-xl flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-charcoal text-sm line-clamp-2">{product.name}</h4>
                    <p className="text-himalayan text-sm font-bold mt-0.5">{product.price}</p>
                  </div>
                  <ArrowRight size={16} className="text-gray-300 flex-shrink-0" />
                </motion.div>
              ))}
              {!query.trim() && (
                <div className="p-6 text-center text-charcoal-light text-sm">
                  Start typing to search products...
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
