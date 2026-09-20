import { describe, expect, it } from 'vitest';
import {
  CatalogLoadError,
  parseAdminCatalogRows,
  parsePublicCatalogRows,
} from './repository';

describe('catalog read error boundary', () => {
  it('accepts an explicitly empty admin catalog as a real zero-product result', () => {
    expect(parseAdminCatalogRows({ page: { rows: [] } })).toEqual([]);
  });

  it('accepts public catalog rows without converting them to a false empty result', () => {
    const row = { id: 'p-1', name: 'Salt Block' };
    expect(parsePublicCatalogRows({ products: [row] })).toEqual([row]);
  });

  it('rejects malformed responses instead of treating them as an empty catalog', () => {
    expect(parseAdminCatalogRows({ page: {} })).toBeNull();
    expect(parsePublicCatalogRows({ products: 'not-an-array' })).toBeNull();
    expect(new CatalogLoadError().message).toBe('The product catalog could not be loaded.');
  });
});
