import { describe, expect, it } from 'vitest';

import { localBusinessJsonLd } from './jsonLd';

/**
 * The public structured data is published content: it is what a search engine
 * shows for the store. It had drifted from the approved storefront copy — the
 * LocalBusiness description still read as the cooking/home-only rewrite and
 * advertised lamps the catalogue does not carry. These assertions keep it
 * describing what the store actually sells.
 */
describe('localBusinessJsonLd', () => {
  const description = String((localBusinessJsonLd() as { description?: string }).description || '');

  it('describes the approved positioning, not the cooking-only rewrite', () => {
    expect(description).toMatch(/livestock/i);
    expect(description).not.toMatch(/unrefined/i);
  });

  it('does not advertise a product line the catalogue does not carry', () => {
    expect(description).not.toMatch(/lamps/i);
  });

  it('keeps the business identity the price list states', () => {
    const schema = localBusinessJsonLd();
    expect(schema.telephone).toBe('+1-832-224-6466');
    expect(schema['@type']).toBe('LocalBusiness');
  });
});
