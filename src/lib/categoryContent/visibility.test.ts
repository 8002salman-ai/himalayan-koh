import { describe, expect, it } from 'vitest';
import { CATEGORY_FILTER_TABS, CATEGORY_LINK_BY_TITLE } from './keys';
import { NICHE_SECTIONS } from '../catalog/nicheSections';

describe('storefront category visibility', () => {
  it('hides Bulk & Wholesale from public filters without removing its taxonomy record', () => {
    const bulk = NICHE_SECTIONS.find((section) => section.key === 'bulk');
    expect(bulk).toMatchObject({ label: 'Bulk & Wholesale', visibleInStorefront: false });
    expect(CATEGORY_FILTER_TABS.some((tab) => tab.label === 'Bulk & Wholesale')).toBe(false);
    expect(CATEGORY_LINK_BY_TITLE['Bulk & Wholesale']).toBeUndefined();
  });

  it('keeps the other public shelves visible', () => {
    expect(CATEGORY_FILTER_TABS.map((tab) => tab.label)).toEqual([
      'All',
      'Edible Pink Salt',
      'Cooking & Serving',
      'Salt Licks & Blocks',
      'Salt Lamps & Décor',
    ]);
  });
});
