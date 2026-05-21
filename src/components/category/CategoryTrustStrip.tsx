import { ChevronDown, ShieldCheck } from 'lucide-react';
import type { CategoryTrustPoint } from '../../lib/categoryContent';

interface Props {
  points: CategoryTrustPoint[];
}

/** Collapsed by default — avoids repeating long copy under the gallery. */
export default function CategoryTrustStrip({ points }: Props) {
  if (points.length === 0) return null;

  return (
    <details className="group rounded-xl border border-gray-100/90 bg-gray-50/80">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-xs font-medium text-charcoal-light hover:text-charcoal transition-colors [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-himalayan shrink-0" aria-hidden />
          Quality highlights ({points.length})
        </span>
        <ChevronDown
          size={14}
          className="shrink-0 text-charcoal-light transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <ul className="flex flex-wrap gap-1.5 px-3 pb-3 pt-0" role="list">
        {points.map((point) => (
          <li key={point.label} title={point.detail}>
            <span className="inline-block rounded-full border border-gray-200/80 bg-white px-2.5 py-1 text-[11px] font-medium text-charcoal">
              {point.label}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
