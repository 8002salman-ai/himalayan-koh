import { describe, expect, it } from 'vitest';
import {
  countOffNicheProducts,
  filterNicheProducts,
  isNicheCategory,
  isNicheProduct,
  isOffNicheText,
  sectionsWithProducts,
} from './niche';
import { nicheSectionKeyFor } from './nicheSections';

/**
 * The staging catalog as it actually stands (see the niche audit doc). These
 * cases are the real rows, not invented ones, so a change to the guard shows up
 * here as a change to what the storefront would serve.
 *
 * The description on row 2321 is the real one: a neutrally named, neutrally filed
 * pouch whose copy opens "Elevate Livestock Well-being ... your animals". It is the
 * reason the guard judges copy at all — it passed on name and category alone, and
 * its description was reaching the catalogue payload of every visitor.
 */
const STAGING_CATALOG = [
  { name: 'Himalayan Koh Edible Pink Salt', category: 'Uncategorized' },
  { name: 'Himalayan Koh Edible Pink Salt Jar', category: 'Uncategorized' },
  { name: 'HIMALAYAN ROCK SALT BAG 18 LBS', category: 'Bulk Order' },
  { name: 'HIMALAYAN SALT POUCHES', category: 'Bulk Order' },
  {
    name: 'Himalayan Koh Pink Salt Pouches',
    category: 'Uncategorized',
    description:
      'Elevate Livestock Well-being with Our Himalayan Pink Salt Pouches. Choose between two grain sizes to suit the preferences and consumption patterns of your animals. The finer texture makes it an ideal choice for mixing with feed or including in water sources.',
  },
  {
    name: 'HIMALAYAN CRYSTAL ROCK SALT LAMP IONIZER AIR PURIFIER WITH DIMMABLE CORD',
    category: 'Uncategorized',
  },
  { name: 'Himalayan Chef Himalayan Pink Salt Coarse Grain, Jar-1 lbs', category: 'Uncategorized' },
  { name: 'Himalayan Chef Himalayan Pink Salt Fine Grain, Jar-1 lbs', category: 'Uncategorized' },
  { name: 'SALT LICKS', category: 'Bulk Order' },
  { name: 'Himalayan Pink Salt Block for Deer', category: 'animal feed' },
  { name: 'Himalayan Koh Salt Licks for Horses', category: 'animal feed' },
];

describe('isOffNicheText', () => {
  it('matches the animal terms the store does not sell', () => {
    for (const text of [
      'SALT LICKS',
      'Himalayan Salt Licks for Horses',
      'Salt Block for Deer',
      'animal feed',
      'Salt for Cattle',
      'Dog Chew',
      'Cat Litter',
      'Poultry Grit',
      'Livestock Salt Lumps',
      'Wildlife Block',
      'Equine Mineral',
    ]) {
      expect(isOffNicheText(text), text).toBe(true);
    }
  });

  it('does not match these on a substring inside a longer word', () => {
    for (const text of [
      'Himalayan Pink Salt Coarse Grain, Jar-1 lbs',
      'Category Hub',
      'Cowhide Pattern Plate', // 'cow' inside a longer word
      'Petite Salt Jar', // 'pet' inside a longer word
      'Salt Lamp with Catania Cord', // 'cat' inside a longer word
      '',
      null,
      undefined,
    ]) {
      expect(isOffNicheText(text), String(text)).toBe(false);
    }
  });
});

describe('isNicheProduct', () => {
  it('keeps every genuine pink salt product in the current catalog', () => {
    const kept = filterNicheProducts(STAGING_CATALOG).map((product) => product.name);
    expect(kept).toHaveLength(7);
    expect(kept).toContain('Himalayan Koh Edible Pink Salt');
    expect(kept).toContain('HIMALAYAN CRYSTAL ROCK SALT LAMP IONIZER AIR PURIFIER WITH DIMMABLE CORD');
    expect(kept).toContain('HIMALAYAN ROCK SALT BAG 18 LBS');
  });

  it('drops the four off-niche products, by name, category or copy', () => {
    expect(countOffNicheProducts(STAGING_CATALOG)).toBe(4);
    const kept = filterNicheProducts(STAGING_CATALOG).map((product) => product.name);
    expect(kept).not.toContain('SALT LICKS');
    expect(kept).not.toContain('Himalayan Pink Salt Block for Deer');
    expect(kept).not.toContain('Himalayan Koh Salt Licks for Horses');
    expect(kept).not.toContain('Himalayan Koh Pink Salt Pouches');
  });

  it('judges a neutrally named product by its category', () => {
    expect(isNicheProduct({ name: 'Pink Salt Block', category: 'animal feed' })).toBe(false);
    expect(isNicheProduct({ name: 'Pink Salt Block', category: 'Edible Pink Salt' })).toBe(true);
  });

  it('judges a neutrally named, neutrally filed product by its copy', () => {
    const nameAndCategoryOnly = { name: 'Himalayan Koh Pink Salt Pouches', category: 'Uncategorized' };
    expect(isNicheProduct(nameAndCategoryOnly)).toBe(true);
    expect(
      isNicheProduct({
        ...nameAndCategoryOnly,
        description: 'Our pouches suit your livestock and your animals, mixed with feed.',
      })
    ).toBe(false);
  });

  it('treats a missing category or description as no evidence of being off-niche', () => {
    expect(isNicheProduct({ name: 'Himalayan Pink Salt Jar', category: null })).toBe(true);
    expect(isNicheProduct({ name: 'Himalayan Pink Salt Jar', description: null })).toBe(true);
    expect(isNicheProduct({ name: 'Himalayan Pink Salt Jar', description: '' })).toBe(true);
  });
});

describe('isNicheCategory', () => {
  it('hides the animal-feed category and keeps the rest', () => {
    expect(isNicheCategory('animal feed')).toBe(false);
    expect(isNicheCategory('Bulk Order')).toBe(true);
    expect(isNicheCategory('Edible Pink Salt')).toBe(true);
    expect(isNicheCategory('Salt Lamps & Décor')).toBe(true);
  });
});

describe('nicheSectionKeyFor', () => {
  it('places lamps, blocks and bulk where a shopper would look', () => {
    expect(
      nicheSectionKeyFor({
        name: 'HIMALAYAN CRYSTAL ROCK SALT LAMP IONIZER',
        category: 'Uncategorized',
      })
    ).toBe('lamps-decor');
    expect(nicheSectionKeyFor({ name: 'Himalayan Pink Salt Block 30 lbs', category: null })).toBe(
      'cooking-serving'
    );
    expect(nicheSectionKeyFor({ name: 'HIMALAYAN ROCK SALT BAG 18 LBS', category: 'Bulk Order' })).toBe(
      'bulk'
    );
    expect(nicheSectionKeyFor({ name: 'Himalayan Pink Salt Fine Grain Jar', category: null })).toBe(
      'edible-pink-salt'
    );
  });

  it('returns nothing for a product with no salt in it at all', () => {
    expect(nicheSectionKeyFor({ name: 'Canvas Tote Bag', category: 'Bulk Order' })).toBeNull();
    expect(nicheSectionKeyFor({ name: 'Shipping Box', category: 'Uncategorized' })).toBeNull();
  });
});

describe('sectionsWithProducts', () => {
  it('lists only shelves that actually hold something, with real counts', () => {
    const sections = sectionsWithProducts(STAGING_CATALOG);
    expect(sections.map((section) => section.key)).toEqual([
      'edible-pink-salt',
      'lamps-decor',
      'bulk',
    ]);
    expect(sections.find((section) => section.key === 'edible-pink-salt')?.count).toBe(4);
    expect(sections.find((section) => section.key === 'bulk')?.count).toBe(2);
    expect(sections.find((section) => section.key === 'lamps-decor')?.count).toBe(1);
    // No bath or gift-set shelf exists yet, and none is invented to fill the row.
    expect(sections).toHaveLength(3);
  });

  it('does not invent a section for an empty catalog', () => {
    expect(sectionsWithProducts([])).toEqual([]);
  });

  it('never counts an off-niche product towards a shelf', () => {
    const onlyAnimal = STAGING_CATALOG.filter((product) => product.category === 'animal feed');
    expect(sectionsWithProducts(onlyAnimal)).toEqual([]);
  });
});
