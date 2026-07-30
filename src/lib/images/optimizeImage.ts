import {
  ALLOWED_PRODUCT_IMAGE_TYPES,
  MAX_PRODUCT_IMAGE_BYTES,
  PRODUCT_IMAGE_FALLBACK_QUALITY,
  PRODUCT_IMAGE_JPEG_QUALITY,
  PRODUCT_IMAGE_MAX_DIMENSION,
  PRODUCT_IMAGE_WEBP_QUALITY,
} from './productImageConstants';

export interface OptimizeImageResult {
  file: File;
  width: number;
  height: number;
  wasOptimized: boolean;
  /** Bytes of the file the admin picked, for reporting the saving in the UI. */
  originalBytes: number;
  /** Encoded output format, or 'original' when the upload was passed through. */
  format: 'webp' | 'jpeg' | 'original';
}

const loadImage = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image file.'));
    };

    image.src = url;
  });

const scaleDimensions = (width: number, height: number, maxDimension: number) => {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }

  const ratio = Math.min(maxDimension / width, maxDimension / height);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
};

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Image optimization failed.'));
          return;
        }
        resolve(blob);
      },
      type,
      quality
    );
  });

/**
 * Draw the source image at the target size.
 *
 * JPEG has no alpha channel, so a transparent source drawn straight onto a
 * fresh canvas encodes its transparent areas as black. Filling white first is
 * only correct for the JPEG path — WebP keeps transparency, so it must not be
 * flattened.
 */
const renderToCanvas = (
  image: HTMLImageElement,
  width: number,
  height: number,
  flattenOntoWhite: boolean
) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not prepare image canvas.');
  }

  if (flattenOntoWhite) {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
  }

  context.drawImage(image, 0, 0, width, height);
  return canvas;
};

/**
 * `toBlob` with an unsupported type does not fail — the browser silently
 * encodes PNG instead. Checking the returned MIME type is the only reliable
 * way to know whether WebP encoding actually happened.
 */
const encodeWebp = async (canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> => {
  const blob = await canvasToBlob(canvas, 'image/webp', quality);
  return blob.type === 'image/webp' ? blob : null;
};

/**
 * Resize oversized product photos and re-encode them as WebP for storage,
 * falling back to JPEG on browsers that cannot encode WebP.
 *
 * GIFs are passed through unchanged so animation survives. An upload that is
 * already smaller than anything we would produce is also passed through, so
 * re-uploading an optimized file never degrades it.
 */
export async function optimizeProductImage(file: File): Promise<OptimizeImageResult> {
  if (!ALLOWED_PRODUCT_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_PRODUCT_IMAGE_TYPES)[number])) {
    throw new Error('Unsupported image type. Use JPG, PNG, WebP, or GIF.');
  }

  const originalBytes = file.size;

  if (file.type === 'image/gif') {
    if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
      throw new Error('GIF must be 5 MB or smaller.');
    }
    return { file, width: 0, height: 0, wasOptimized: false, originalBytes, format: 'original' };
  }

  const image = await loadImage(file);
  const { width, height } = scaleDimensions(
    image.naturalWidth,
    image.naturalHeight,
    PRODUCT_IMAGE_MAX_DIMENSION
  );
  const wasResized = width !== image.naturalWidth || height !== image.naturalHeight;

  let blob = await encodeWebp(renderToCanvas(image, width, height, false), PRODUCT_IMAGE_WEBP_QUALITY);
  let format: 'webp' | 'jpeg' = 'webp';

  if (blob && blob.size > MAX_PRODUCT_IMAGE_BYTES) {
    blob = await encodeWebp(renderToCanvas(image, width, height, false), PRODUCT_IMAGE_FALLBACK_QUALITY);
  }

  if (!blob || blob.size > MAX_PRODUCT_IMAGE_BYTES) {
    const jpegCanvas = renderToCanvas(image, width, height, true);
    format = 'jpeg';
    blob = await canvasToBlob(jpegCanvas, 'image/jpeg', PRODUCT_IMAGE_JPEG_QUALITY);

    if (blob.size > MAX_PRODUCT_IMAGE_BYTES) {
      blob = await canvasToBlob(jpegCanvas, 'image/jpeg', PRODUCT_IMAGE_FALLBACK_QUALITY);
    }
  }

  if (blob.size > MAX_PRODUCT_IMAGE_BYTES) {
    throw new Error('Image is still too large after optimization. Try a smaller photo.');
  }

  // Re-encoding only helps if it actually produced a smaller file. When it did
  // not and the original needs no resizing and already fits, keep the original
  // rather than spending a lossy generation for nothing.
  if (!wasResized && blob.size >= originalBytes && originalBytes <= MAX_PRODUCT_IMAGE_BYTES) {
    return {
      file,
      width: image.naturalWidth,
      height: image.naturalHeight,
      wasOptimized: false,
      originalBytes,
      format: 'original',
    };
  }

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'product-image';
  const extension = format === 'webp' ? 'webp' : 'jpg';
  const optimizedFile = new File([blob], `${baseName}.${extension}`, {
    type: blob.type,
    lastModified: Date.now(),
  });

  return {
    file: optimizedFile,
    width,
    height,
    wasOptimized: true,
    originalBytes,
    format,
  };
}

const formatBytes = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} kB`;

/**
 * One-line summary of what the optimizer did, shown under the thumbnail so the
 * admin can see the format and the saving instead of guessing.
 */
export function describeOptimization(result: OptimizeImageResult): string {
  if (!result.wasOptimized) {
    return `Kept as uploaded · ${formatBytes(result.originalBytes)}`;
  }

  const label = result.format === 'webp' ? 'WebP' : 'JPEG';
  return `${label} · ${formatBytes(result.originalBytes)} → ${formatBytes(result.file.size)}`;
}
