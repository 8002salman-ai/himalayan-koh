export type ProductImageUploadStatus = 'local' | 'uploading' | 'uploaded' | 'error';

export interface AdminProductImage {
  id: string;
  /** Preview URL (blob) or persisted Supabase/public URL. */
  previewUrl: string;
  /** Set after a successful Supabase upload. */
  storageUrl?: string;
  status: ProductImageUploadStatus;
  error?: string;
  file?: File;
  /** Short note on what the optimizer did, e.g. "WebP · 4.1 MB → 210 kB". */
  optimization?: string;
}

export const createAdminProductImage = (
  previewUrl: string,
  options: Partial<AdminProductImage> = {}
): AdminProductImage => ({
  id: crypto.randomUUID(),
  previewUrl,
  status: 'uploaded',
  ...options,
});

export const adminImagesToUrls = (images: AdminProductImage[]) =>
  images
    .map((image) => image.storageUrl || (image.status === 'uploaded' ? image.previewUrl : ''))
    .filter((url) => url && !url.startsWith('blob:'));
