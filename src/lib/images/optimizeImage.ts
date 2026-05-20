import {
  ALLOWED_PRODUCT_IMAGE_TYPES,
  MAX_PRODUCT_IMAGE_BYTES,
  PRODUCT_IMAGE_JPEG_QUALITY,
  PRODUCT_IMAGE_MAX_DIMENSION,
} from './productImageConstants';

export interface OptimizeImageResult {
  file: File;
  width: number;
  height: number;
  wasOptimized: boolean;
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

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
) =>
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
 * Resize large product photos and re-encode as JPEG/WebP-friendly output for storage.
 * GIFs are passed through unchanged to preserve animation.
 */
export async function optimizeProductImage(file: File): Promise<OptimizeImageResult> {
  if (!ALLOWED_PRODUCT_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_PRODUCT_IMAGE_TYPES)[number])) {
    throw new Error('Unsupported image type. Use JPG, PNG, WebP, or GIF.');
  }

  if (file.size <= MAX_PRODUCT_IMAGE_BYTES && file.type === 'image/gif') {
    return { file, width: 0, height: 0, wasOptimized: false };
  }

  if (file.type === 'image/gif') {
    if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
      throw new Error('GIF must be 5 MB or smaller.');
    }
    return { file, width: 0, height: 0, wasOptimized: false };
  }

  const image = await loadImage(file);
  const { width, height } = scaleDimensions(image.naturalWidth, image.naturalHeight, PRODUCT_IMAGE_MAX_DIMENSION);
  const shouldResize = width !== image.naturalWidth || height !== image.naturalHeight;
  const shouldReencode = file.size > MAX_PRODUCT_IMAGE_BYTES * 0.85 || shouldResize || file.type === 'image/png';

  if (!shouldResize && !shouldReencode && file.size <= MAX_PRODUCT_IMAGE_BYTES) {
    return {
      file,
      width: image.naturalWidth,
      height: image.naturalHeight,
      wasOptimized: false,
    };
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not prepare image canvas.');
  }

  context.drawImage(image, 0, 0, width, height);

  const outputType = file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
  const extension = outputType === 'image/webp' ? 'webp' : 'jpg';
  let blob = await canvasToBlob(canvas, outputType, PRODUCT_IMAGE_JPEG_QUALITY);

  if (blob.size > MAX_PRODUCT_IMAGE_BYTES && outputType !== 'image/jpeg') {
    blob = await canvasToBlob(canvas, 'image/jpeg', PRODUCT_IMAGE_JPEG_QUALITY);
  }

  if (blob.size > MAX_PRODUCT_IMAGE_BYTES) {
    blob = await canvasToBlob(canvas, 'image/jpeg', 0.72);
  }

  if (blob.size > MAX_PRODUCT_IMAGE_BYTES) {
    throw new Error('Image is still too large after optimization. Try a smaller photo.');
  }

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'product-image';
  const optimizedFile = new File([blob], `${baseName}.${extension}`, {
    type: blob.type,
    lastModified: Date.now(),
  });

  return {
    file: optimizedFile,
    width,
    height,
    wasOptimized: true,
  };
}
