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
  categoryLabel,
  emptyMessage,
}: Props) {
  const visible = resources.filter((r) => r.visible !== false);

  return (
    <section aria-labelledby="category-pdf-heading" className="pt-1 border-t border-gray-100">
      <div className="flex items-center gap-2 mb-3 mt-4">
        <FileText size={18} className="text-himalayan" aria-hidden />
        <div>
          <h3 id="category-pdf-heading" className="font-serif text-base font-bold text-charcoal">
            PDF resources
          </h3>
          <p className="text-xs text-charcoal-light mt-0.5">
            Downloads for {categoryLabel}
          </p>
        </div>
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
