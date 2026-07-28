-- The storefront intentionally lists only products with an approved packing
-- profile. Keep these product records in sync with their Shippo packing data.
UPDATE products
SET tags = ARRAY[
  'livestock', 'horses', 'cattle', 'goats', 'deer', 'sheep', 'llamas',
  'salt lick', 'rope lick', '2lb',
  'packing_profile:%7B%22productLengthIn%22%3A3.5%2C%22productWidthIn%22%3A3.5%2C%22productHeightIn%22%3A3.5%2C%22boxLengthIn%22%3A10%2C%22boxWidthIn%22%3A10%2C%22boxHeightIn%22%3A6%2C%22packagingWeightLbs%22%3A0.5%2C%22unitsPerBox%22%3A4%2C%22maxPackedWeightLbs%22%3A10%2C%22shipsSeparately%22%3Afalse%2C%22canMix%22%3Atrue%2C%22fragile%22%3Afalse%2C%22stackable%22%3Atrue%7D'
], updated_at = NOW()
WHERE slug = 'himalayan-2lb-round-rope-salt-lick';

UPDATE products
SET tags = ARRAY[
  'livestock', 'horses', 'cattle', 'goats', 'deer', 'sheep', 'llamas',
  'salt lick', 'rope lick', '6lb',
  'packing_profile:%7B%22productLengthIn%22%3A5%2C%22productWidthIn%22%3A5%2C%22productHeightIn%22%3A5%2C%22boxLengthIn%22%3A10%2C%22boxWidthIn%22%3A10%2C%22boxHeightIn%22%3A6%2C%22packagingWeightLbs%22%3A0.5%2C%22unitsPerBox%22%3A1%2C%22maxPackedWeightLbs%22%3A10%2C%22shipsSeparately%22%3Afalse%2C%22canMix%22%3Atrue%2C%22fragile%22%3Afalse%2C%22stackable%22%3Atrue%7D'
], updated_at = NOW()
WHERE slug = 'himalayan-6lb-round-rope-salt-lick';

UPDATE products
SET tags = ARRAY[
  'livestock', 'horses', 'cattle', 'goats', 'deer', 'sheep', 'llamas',
  'salt lick', 'trace minerals', '6lb',
  'packing_profile:%7B%22productLengthIn%22%3A6%2C%22productWidthIn%22%3A4%2C%22productHeightIn%22%3A3%2C%22boxLengthIn%22%3A10%2C%22boxWidthIn%22%3A10%2C%22boxHeightIn%22%3A6%2C%22packagingWeightLbs%22%3A0.5%2C%22unitsPerBox%22%3A1%2C%22maxPackedWeightLbs%22%3A10%2C%22shipsSeparately%22%3Afalse%2C%22canMix%22%3Atrue%2C%22fragile%22%3Afalse%2C%22stackable%22%3Atrue%7D'
], updated_at = NOW()
WHERE slug = 'himalayan-6lb-trace-mineral-salt-block';
