-- Use the label-preserving white-background catalog images in the live product galleries.
UPDATE products
SET
  images = ARRAY[
    '/images/products/white-background/himalayan-6lb-salt-lick-front-white.png',
    '/images/products/white-background/himalayan-6lb-salt-lick-side-white.png',
    '/images/products/white-background/himalayan-6lb-salt-lick-back-white.png'
  ],
  thumbnail = '/images/products/white-background/himalayan-6lb-salt-lick-front-white.png',
  updated_at = NOW()
WHERE slug = 'himalayan-6lb-trace-mineral-salt-block';

UPDATE products
SET
  images = ARRAY[
    '/images/products/white-background/himalayan-round-rope-salt-lick-front-white.png',
    '/images/products/white-background/himalayan-round-rope-salt-lick-angle-white.png',
    '/images/products/white-background/himalayan-round-rope-salt-lick-top-white.png'
  ],
  thumbnail = '/images/products/white-background/himalayan-round-rope-salt-lick-front-white.png',
  updated_at = NOW()
WHERE slug IN ('himalayan-2lb-round-rope-salt-lick', 'himalayan-6lb-round-rope-salt-lick');
