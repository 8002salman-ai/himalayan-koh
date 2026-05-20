import { Link } from 'react-router-dom';
import {
  CATEGORY_FILTER_TABS,
  buildProductsCategoryPath,
  type CategoryContentKey,
} from '../../lib/categoryContent';

interface Props {
  activeFilter: string;
}

/** URL-driven category pills — deep links and browser history work out of the box. */
export default function CategoryFilterNav({ activeFilter }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 sm:flex-wrap sm:justify-center sm:overflow-visible scrollbar-thin">
      {CATEGORY_FILTER_TABS.map((tab) => {
        const isActive = activeFilter === tab.label;
        const to = tab.key
          ? buildProductsCategoryPath(tab.key as CategoryContentKey)
          : '/products';

        return (
          <Link
            key={tab.label}
            to={to}
            replace={false}
            className={`shrink-0 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
              isActive
                ? 'bg-himalayan text-white shadow-lg shadow-himalayan/25'
                : 'bg-white text-charcoal hover:bg-himalayan-lighter border border-gray-200'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
