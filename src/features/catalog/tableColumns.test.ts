import { describe, expect, it } from 'vitest';
import {
  CATALOG_COLUMN_KEYS,
  loadCatalogColumns,
} from './tableColumns';

describe('catalog column hydration state', () => {
  it('uses the same default order when browser storage is unavailable', () => {
    expect(loadCatalogColumns(null)).toEqual([...CATALOG_COLUMN_KEYS]);
  });

  it('restores a valid client preference without changing the server default', () => {
    const storage = {
      getItem: () => JSON.stringify(['price', 'product', 'price', 'unknown']),
      setItem: () => undefined,
    };

    expect(loadCatalogColumns(null)).toEqual([...CATALOG_COLUMN_KEYS]);
    expect(loadCatalogColumns(storage)).toEqual([
      'price',
      'product',
      ...CATALOG_COLUMN_KEYS.filter((key) => key !== 'price' && key !== 'product'),
    ]);
  });
});
