import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { isWooId, updateProduct, saveProductImages, saveProductVariants, getProduct } from './repository';
import { SupabaseAdapter } from '../../services/db';

describe('WooCommerce numeric ID routing and UUID safety', () => {
  it('correctly classifies numeric IDs vs UUIDs vs slugs', () => {
    expect(isWooId('2497')).toBe(true);
    expect(isWooId('1')).toBe(true);
    expect(isWooId('104592')).toBe(true);
    expect(isWooId('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d')).toBe(false);
    expect(isWooId('himalayan-rock-salt-45-lbs')).toBe(false);
    expect(isWooId('')).toBe(false);
  });

  describe('SupabaseAdapter 22P02 error handling', () => {
    let adapter: SupabaseAdapter;

    beforeEach(() => {
      adapter = new SupabaseAdapter('https://example.supabase.co', 'anon-key');
    });

    it('returns null on get() when Postgres returns 22P02 invalid input syntax for uuid', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        clone: () => ({
          text: async () => JSON.stringify({ code: '22P02', message: 'invalid input syntax for type uuid: "2497"' }),
        }),
        text: async () => JSON.stringify({ code: '22P02', message: 'invalid input syntax for type uuid: "2497"' }),
      } as unknown as Response);

      vi.stubGlobal('fetch', mockFetch);

      const result = await adapter.get('products', '2497');
      expect(result).toBeNull();

      vi.unstubAllGlobals();
    });

    it('returns empty array on list() when Postgres returns 22P02', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        clone: () => ({
          text: async () => JSON.stringify({ code: '22P02', message: 'invalid input syntax for type uuid: "2497"' }),
        }),
        text: async () => JSON.stringify({ code: '22P02', message: 'invalid input syntax for type uuid: "2497"' }),
      } as unknown as Response);

      vi.stubGlobal('fetch', mockFetch);

      const result = await adapter.list('product_images', { filters: { product_id: '2497' } });
      expect(result).toEqual([]);

      vi.unstubAllGlobals();
    });

    it('returns null on findFirst() when Postgres returns 22P02', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        clone: () => ({
          text: async () => JSON.stringify({ code: '22P02', message: 'invalid input syntax for type uuid: "2497"' }),
        }),
        text: async () => JSON.stringify({ code: '22P02', message: 'invalid input syntax for type uuid: "2497"' }),
      } as unknown as Response);

      vi.stubGlobal('fetch', mockFetch);

      const result = await adapter.findFirst('products', 'id', '2497');
      expect(result).toBeNull();

      vi.unstubAllGlobals();
    });
  });

  describe('WooCommerce product updates via API route', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('routes updateProduct("2497") to /api/admin/products/2497 with PUT', async () => {
      const mockFetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (typeof url === 'string' && url.includes('/api/admin/products/2497')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              product: {
                id: 2497,
                name: 'Himalayan Rock Salt — 45 lbs (2–3 large chunks)',
                slug: 'himalayan-rock-salt-45-lbs',
                status: 'publish',
                price: 45,
                images: ['https://example.com/img1.webp'],
              },
            }),
          } as unknown as Response);
        }
        return Promise.resolve({ ok: false, status: 404 } as unknown as Response);
      });

      vi.stubGlobal('fetch', mockFetch);

      const updated = await updateProduct('2497', {
        name: 'Himalayan Rock Salt — 45 lbs (2–3 large chunks)',
        price: 45,
      });

      expect(updated).not.toBeNull();
      expect(updated?.id).toBe('2497');
      expect(updated?.name).toBe('Himalayan Rock Salt — 45 lbs (2–3 large chunks)');

      // Verify fetch was called with PUT to /api/admin/products/2497
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/products/2497',
        expect.objectContaining({
          method: 'PUT',
        }),
      );
    });

    it('routes saveProductImages("2497") to /api/admin/products/2497 instead of Supabase product_images', async () => {
      const mockFetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (typeof url === 'string' && url.includes('/api/admin/products/2497')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              product: {
                id: 2497,
                name: 'Himalayan Rock Salt — 45 lbs (2–3 large chunks)',
                slug: 'himalayan-rock-salt-45-lbs',
                status: 'publish',
                images: ['https://example.com/photo1.webp', 'https://example.com/photo2.webp'],
              },
            }),
          } as unknown as Response);
        }
        return Promise.resolve({ ok: false, status: 404 } as unknown as Response);
      });

      vi.stubGlobal('fetch', mockFetch);

      const res = await saveProductImages('2497', [
        { url: 'https://example.com/photo1.webp' },
        { url: 'https://example.com/photo2.webp' },
      ], { reload: true });

      expect(res).not.toBeNull();
      expect(res?.images.length).toBe(2);
      expect(res?.images[0].url).toBe('https://example.com/photo1.webp');

      // Verify PUT payload had images
      const putCall = mockFetch.mock.calls.find(([url]) => url === '/api/admin/products/2497');
      expect(putCall).toBeDefined();
      const body = JSON.parse(putCall![1].body);
      expect(body.images).toEqual(['https://example.com/photo1.webp', 'https://example.com/photo2.webp']);
    });
  });
});
