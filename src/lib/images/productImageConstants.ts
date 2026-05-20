export const MAX_PRODUCT_IMAGES = 5;

/** Matches Supabase `products` bucket limit (5 MB). */
export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;

export const ALLOWED_PRODUCT_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export const ALLOWED_PRODUCT_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'] as const;

export const PRODUCT_IMAGE_MAX_DIMENSION = 1600;

export const PRODUCT_IMAGE_JPEG_QUALITY = 0.82;
