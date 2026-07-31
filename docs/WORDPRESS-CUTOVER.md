# Shutting down the old WordPress site

The storefront used to load nine images directly from
`himalayankoh.com/wp-content/uploads/`. Eighty-three references across the code
and the database pointed at that host, so turning WordPress off would have left
broken images on the home page, the About page, every category hub, the blog
list, and several product galleries.

Every one of those references now points at `/images/legacy/...` on our own
domain. Once the files are committed there, Vercel serves them from its CDN and
nothing in the application reaches WordPress at all.

## The nine files

| File in `public/images/legacy/` | Originally |
| --- | --- |
| `horse-salt-lick-paddock.jpg` | `2021/03/horse-lick-himalayan-salt5-600x450.jpg` |
| `horse-licking-salt.jpg` | `2017/10/slat-licking-horse.jpg` |
| `horses-grazing-banner.jpg` | `2019/08/horses-1300x200.jpg` |
| `cattle-grazing.jpg` | `2017/10/blog9.jpg` |
| `cattle-salt-bag.jpg` | `2020/10/1-600x450.jpeg` |
| `bowl-of-salt.jpg` | `2017/10/bowl-of-salt.jpg` |
| `salt-pouch-6lb.webp` | `2025/07/6-lbs-pouche.webp` |
| `pink-salt-16oz-jar.jpg` | `2024/08/WhatsApp-Image-2024-08-02-at-11.31.07-PM-500x500.jpeg` |
| `salt-rock-bag.jpg` | `2023/08/S6-600x450.jpg` |

`src/lib/images/legacyAssets.ts` is the only place these paths are written down.
Every page imports `legacyImage('...')` from it, so moving the files somewhere
else later is a one-file change.

## Current state

The code and the database both use `/images/legacy/...` already — migration 026
has run. The nine image files are **not** in the repo yet, so those paths are
currently served from WordPress by the `LEGACY_IMAGE_FALLBACKS` rewrites in
`next.config.ts`.

Those are `fallback` rewrites: Next.js only reaches them when nothing else
matched, which includes the filesystem. As soon as a real file exists at
`public/images/legacy/<name>`, that file is served and the rewrite is never
reached. Nothing needs switching over — adding the files is the switch.

Every build prints which images are still coming from WordPress.

## Remaining step

One thing is left, and it has to happen **before** WordPress goes offline,
because it downloads from it.

### Download the images and commit them

```bash
npm run images:fetch
git add public/images/legacy
git commit -m "chore(images): add rehosted WordPress images"
```

The script is idempotent and skips files that already exist; pass `--force` to
re-download. If WordPress is already gone, export the nine originals from the
WordPress media library instead and save them under the filenames in the table
above — the names are what matter, not how they get there.

`npm run build` runs `scripts/check-legacy-images.mjs` first. It names every
image still coming from WordPress, so an incomplete cutover cannot go unnoticed.
It does not fail the build — the fallback rewrites mean those paths still
resolve — but the warning stands until the files are in.

### Already done: image URLs in the database

Product, category, blog, and order rows in Supabase held the old
`himalayankoh.com` URLs; editing `seed.sql` does not touch live data, so this
took a migration:

```bash
psql "$SUPABASE_DB_URL" -f supabase/migrations/026_rehost_wordpress_images.sql
```

or paste it into the Supabase SQL editor. It covers `categories.image_url`,
`products.thumbnail`, `products.images`, `product_images.image_url`,
`blog_posts.featured_image`, and `order_items.product_image`. It is idempotent,
and it prints a warning naming the row count if anything still references
WordPress afterwards.

This has already been run against production, which is why the fallback rewrites
exist: the database pointed at `/images/legacy/...` before the files did.

### Verify, then turn WordPress off

```bash
npm run build   # includes the missing-image check
```

Load the home page, About, a category hub, the blog list, and a livestock
product page, and confirm no request in the browser network tab goes to
`himalayankoh.com/wp-content`. Then the WordPress install can be shut down.

## What stays behind

Once the files are committed, delete `LEGACY_IMAGE_FALLBACKS` and the
`rewrites()` block from `next.config.ts`, and drop the `himalayankoh.com` entry
from `images.remotePatterns`. Those three are the last references to the old
host; leaving them in place would keep the dependency alive silently.

The old WordPress *page* URLs are a separate matter and still handled:
`src/lib/seo/legacyRedirects.ts` 301-redirects them to their new locations so
existing search rankings and inbound links survive. That file stays.
