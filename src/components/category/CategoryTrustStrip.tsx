import { ShieldCheck } from 'lucide-react';
import type { CategoryTrustPoint } from '../../lib/categoryContent';

interface Props {
  points: CategoryTrustPoint[];
}

export default function CategoryTrustStrip({ points }: Props) {
  if (points.length === 0) return null;

  return (
    <ul className="grid gap-3 sm:grid-cols-1" role="list">
      {points.map((point) => (
        <li
          key={point.label}
          className="flex gap-3 rounded-xl border border-gray-100 bg-warm-white p-4"
        >
          <ShieldCheck size={20} className="text-himalayan shrink-0 mt-0.5" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-charcoal">{point.label}</p>
            <p className="text-xs text-charcoal-light mt-1 leading-relaxed">{point.detail}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
