/**
 * Extract the object path inside the Supabase `products` bucket from a public URL.
 * Supports both legacy `products/<file>` and newer `<productId>/<file>` layouts.
 */
export function extractProductStoragePath(imageUrl: string): string | null {
  if (!imageUrl || imageUrl.startsWith('blob:')) return null;

  try {
    const url = new URL(imageUrl);
    const marker = '/storage/v1/object/public/products/';
    const idx = url.pathname.indexOf(marker);
    if (idx !== -1) {
      return decodeURIComponent(url.pathname.slice(idx + marker.length));
    }
  } catch {
    // Fall through to string parsing for relative URLs.
  }

  const parts = imageUrl.split('/products/');
  if (parts.length < 2) return null;

  return parts.slice(1).join('/products/').split('?')[0] || null;
}

export function isSupabaseProductImageUrl(imageUrl: string): boolean {
  return Boolean(extractProductStoragePath(imageUrl));
}
