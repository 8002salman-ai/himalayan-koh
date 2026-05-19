import type { Product } from '../data/products';
import ProductDetailView from './ProductDetailView';

interface Props {
  product: Product | null;
  onClose: () => void;
}

export default function ProductModal({ product, onClose }: Props) {
  if (!product) return null;

  return <ProductDetailView product={product} variant="modal" onClose={onClose} />;
}
