import { FileText } from 'lucide-react';
import type { PdpPdfResource } from '../../lib/products/pdpContent';
import ProductPdfLibrary from '../product/ProductPdfLibrary';
import PdpEmptyState from '../product/PdpEmptyState';

interface Props {
  resources: PdpPdfResource[];
  categoryLabel: string;
  emptyMessage?: string;
}

/** Category-specific PDF downloads — always last in the education column. */
export default function CategoryPdfResources({
  resources,
  emptyMessage,
}: Props) {
  const visible = resources.filter((r) => r.visible !== false);

  return (
    <section aria-labelledby="category-pdf-heading" className="border-t border-gray-100 pt-6">
      <div className="flex items-center gap-2 mb-3">
        <FileText size={16} className="text-himalayan" aria-hidden />
        <h3 id="category-pdf-heading" className="font-serif text-base font-bold text-charcoal">
          PDF downloads
        </h3>
      </div>

      {visible.length > 0 ? (
        <ProductPdfLibrary resources={resources} embedded />
      ) : (
        <PdpEmptyState
          title="Resources"
          message={emptyMessage || 'PDF guides for this category will be added soon.'}
          compact
        />
      )}
    </section>
  );
}
