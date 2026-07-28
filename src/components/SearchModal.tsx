import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ArrowRight, Package } from 'lucide-react';
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
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q),
    );
  }, [query]);

  const handleProductClick = (slug: string) => {
    onClose();
    navigate(`/products/${slug}`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-modal bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[12vh] px-4 pb-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.97 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[76dvh]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Product search"
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 p-4 sm:p-5 border-b border-gray-100 flex-shrink-0">
              <Search size={20} className="text-gray-400 flex-shrink-0" />
              <input
                ref={inputRef}
                type="search"
                placeholder="Search products, categories…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 text-base sm:text-lg text-charcoal placeholder:text-gray-300 focus:outline-none bg-transparent"
                aria-label="Search products"
              />
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors flex-shrink-0"
                aria-label="Close search"
              >
                <X size={14} />
              </button>
            </div>

            {/* Results — scrollable */}
            <div className="overflow-y-auto scrollbar-thin flex-1">
              {query.trim() && results.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-charcoal-light">
                  <Package size={36} className="mb-3 text-gray-200" />
                  <p className="font-medium text-charcoal">No products found</p>
                  <p className="text-sm mt-1">Try searching by product name or category</p>
                </div>
              )}
              {results.map((product) => (
                <motion.button
                  key={product.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  type="button"
                  className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 text-left"
                  onClick={() => handleProductClick(product.slug)}
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    loading="lazy"
                    decoding="async"
                    className="w-14 h-14 object-cover rounded-xl flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/placeholder-product.svg';
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-charcoal text-sm line-clamp-2">
                      {product.name}
                    </h4>
                    <p className="text-himalayan text-sm font-bold mt-0.5">{product.price}</p>
                  </div>
                  <ArrowRight size={16} className="text-gray-300 flex-shrink-0" />
                </motion.button>
              ))}
              {!query.trim() && (
                <div className="py-10 px-4 text-center text-charcoal-light text-sm">
                  Start typing to search products…
                </div>
              )}
            </div>

            {/* Footer hint */}
            {results.length > 0 && (
              <div className="px-4 py-2.5 border-t border-gray-100 flex-shrink-0 flex items-center justify-between text-xs text-gray-400">
                <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
                <span>Press Esc to close</span>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
