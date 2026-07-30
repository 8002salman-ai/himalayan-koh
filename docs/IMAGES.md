# Product images

## Uploads from the admin panel

Every image added through Add Product or the image tab of the product editor
goes through `optimizeProductImage` (`src/lib/images/optimizeImage.ts`) in the
browser, before it reaches Supabase Storage. It:

1. Scales anything larger than 1600 px on its longest side down to 1600 px.
2. Re-encodes to **WebP** at quality 0.82.
3. Falls back to JPEG only if the browser cannot encode WebP, or if WebP still
   exceeds the 5 MB bucket limit. The JPEG path fills a white background first,
   because JPEG has no alpha channel and a transparent source would otherwise
   encode its transparent areas as black.
4. Keeps the original file untouched if re-encoding did not actually make it
   smaller, so re-uploading an already-optimized image never degrades it.
5. Passes GIFs through unchanged, so animation survives.

The thumbnail in the editor shows what happened — `WebP · 4.1 MB → 210 kB`, or
`Kept as uploaded · 180 kB`. Nothing to configure: upload a PNG straight from a
phone or camera and it is stored as WebP.

Before this, uploads were re-encoded to JPEG, which was both larger than WebP
and lossy about transparency.

Limits live in `src/lib/images/productImageConstants.ts`: 5 images per product,
5 MB per file, 1600 px maximum dimension, JPG/PNG/WebP/GIF accepted.

## Files committed to the repo

`public/images/products/` holds the six salt-lick photographs (plus
white-background variants). They were 4 MB PNGs — 24.3 MB for twelve files — and
are now WebP at the same pixel dimensions, 0.98 MB in total, with transparency
preserved. Mean per-pixel difference against the originals is about 1.5/255,
which is not visible.

They were converted with sharp:

```js
sharp(input).webp({ quality: 82, effort: 6, alphaQuality: 90 })
```

The `.png` originals are still in the repo. Delete them once migration
`027_product_images_to_webp.sql` has run against production and the product
pages look right:

```bash
rm public/images/products/*.png public/images/products/white-background/*.png
```

Deploy the code before running that migration — the code ships the `.webp`
files, and the migration points database rows at them.

`public/images/legacy/` is separate: those are the nine images rehosted from the
old WordPress site. See [WORDPRESS-CUTOVER.md](./WORDPRESS-CUTOVER.md).
