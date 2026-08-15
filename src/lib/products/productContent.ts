import type { Product } from '../../data/products';

export interface ProductFaq {
  question: string;
  answer: string;
}

export interface TrustIndicator {
  label: string;
  detail: string;
}

export interface ProductContent {
  displayName: string;
  metaTitle?: string;
  metaDescription?: string;
  useCases: string[];
  mineralHighlights: string[];
  shippingInfo: string[];
  trustIndicators: TrustIndicator[];
  faqs: ProductFaq[];
}

const SHARED_TRUST: TrustIndicator[] = [
  { label: '100% natural', detail: 'Unrefined salt with no anti-caking agents or additives.' },
  { label: '84+ trace minerals', detail: 'Naturally occurring minerals from ancient sea deposits.' },
  { label: 'Family-owned quality', detail: 'Trusted by ranchers and home cooks across the U.S.' },
];

const SHARED_SHIPPING: string[] = [
  'Orders ship within 1–2 business days from our Texas warehouse.',
  'Free standard shipping on U.S. orders over $50.',
  'Bulk orders welcome — contact us for quantity pricing.',
];

const CATEGORY_DEFAULTS: Record<string, Omit<ProductContent, 'displayName' | 'metaTitle' | 'metaDescription'>> = {
  'Edible Cooking Salt': {
    useCases: [
      'Everyday cooking, grilling, and finishing dishes',
      'Brining poultry, pork, and vegetables',
      'Salt grinders and table seasoning',
    ],
    mineralHighlights: [
      'Naturally pink color from iron and trace minerals',
      'Lower sodium perception with fuller mineral flavor',
      'Unprocessed crystals — no bleaching or chemical refining',
    ],
    shippingInfo: SHARED_SHIPPING,
    trustIndicators: [
      ...SHARED_TRUST,
      { label: 'Kosher-friendly', detail: 'Suitable for kitchens that prefer clean-label ingredients.' },
    ],
    faqs: [
      {
        question: 'Is this salt iodized?',
        answer:
          'Our Himalayan pink salt is not iodized. It delivers natural trace minerals without added iodine or anti-caking agents.',
      },
      {
        question: 'Which grain size should I choose?',
        answer:
          'Fine grain dissolves quickly for cooking and baking. Medium and coarse grains work well in grinders and finishing salt.',
      },
      {
        question: 'How should I store it?',
        answer: 'Keep in a cool, dry place in an airtight container. Avoid moisture to preserve texture.',
      },
    ],
  },
  'Salt for Cattle': {
    useCases: [
      'Free-choice mineral supplementation in pasture',
      'Supporting hydration and electrolyte balance',
      'Herd health programs for beef and dairy cattle',
    ],
    mineralHighlights: [
      'Encourages natural licking behavior vs. processed blocks',
      'Delivers calcium, magnesium, potassium, and trace elements',
      'Weather-resistant rock salt suitable for outdoor feeders',
    ],
    shippingInfo: [
      ...SHARED_SHIPPING,
      'Heavy bags ship via freight-friendly carriers — tracking provided at dispatch.',
    ],
    trustIndicators: [
      ...SHARED_TRUST,
      { label: 'Ranch-tested', detail: 'Sized for commercial herds and small farms alike.' },
    ],
    faqs: [
      {
        question: 'How much salt do cattle need?',
        answer:
          'Needs vary by herd size, forage, and climate. Provide free-choice access and monitor consumption — consult your nutritionist for large operations.',
      },
      {
        question: 'Can I use this for horses too?',
        answer:
          'Yes, many customers use Himalayan salt for mixed livestock. For equine-specific licks, see our horse salt lick products.',
      },
      {
        question: 'Is it safe in rain?',
        answer:
          'Rock salt holds up outdoors better than pressed blocks, but shelter feeders from standing water when possible.',
      },
    ],
  },
  'Salt Lick for Horses': {
    useCases: [
      'Stall and paddock mineral access',
      'Trail and training barn supplementation',
      'Reducing boredom with natural licking behavior',
    ],
    mineralHighlights: [
      'Supports electrolyte balance during work and heat',
      'Hard, long-lasting licks compared to pressed alternatives',
      'Naturally appealing taste horses seek out',
    ],
    shippingInfo: SHARED_SHIPPING,
    trustIndicators: [
      ...SHARED_TRUST,
      { label: 'Stable-ready', detail: 'Mount in holders or hang with rope (not included).' },
    ],
    faqs: [
      {
        question: 'How do I mount a salt lick?',
        answer:
          'Use a licensed salt lick holder or secure with heavy-duty rope in a dry, shaded area away from excessive moisture.',
      },
      {
        question: 'How long will one lick last?',
        answer:
          'Lifespan depends on herd size and licking frequency — typically several weeks to months per horse with moderate use.',
      },
      {
        question: 'Can foals use Himalayan salt licks?',
        answer:
          'Provide access only when foals are eating solid feed and always ensure fresh water is available.',
      },
    ],
  },
};

const SLUG_OVERRIDES: Record<string, Partial<ProductContent>> = {
  'himalayan-edible-pink-salt-fine': {
    displayName: 'Edible Pink Salt, Fine Grain',
    metaTitle: 'Edible Pink Salt, Fine Grain | Himalayan Koh',
    metaDescription:
      'Fine-grain Himalayan pink salt for everyday cooking. 84+ trace minerals, unrefined and additive-free. From $9.95 with free U.S. shipping over $50.',
    useCases: [
      'Daily cooking, baking, and brining',
      'Table salt and spice blends',
      'Meal prep and gourmet finishing',
    ],
  },
  'himalayan-pink-salt-16oz-jar': {
    displayName: 'Edible Pink Salt, 16 oz Jar',
    metaTitle: 'Pink Salt 16 oz Jar | Himalayan Koh',
    metaDescription:
      'Pantry-ready 16 oz jar of Himalayan pink salt. Clean flavor, 84+ minerals, fine or coarse options. $9.95 — shop edible salt online.',
  },
  'himalayan-rock-salt-6lbs-pouch': {
    displayName: 'Rock Salt Pouch, 6 lbs',
    metaTitle: 'Himalayan Rock Salt, 6 lb | Himalayan Koh',
    metaDescription:
      '6 lb pouch of Himalayan rock salt in fine or coarse grain. Ideal for kitchens and grinders. $17.95 with fast U.S. shipping.',
  },
  'himalayan-livestock-salt-45lbs': {
    displayName: 'Livestock Pink Salt, 45 lb',
    metaTitle: 'Livestock Salt 45 lb Bag | Himalayan Koh',
    metaDescription:
      '45 lb Himalayan salt for cattle and horses. Natural minerals for herd health and hydration. $99.95 — ranch-ready bulk bag.',
    useCases: [
      'Pasture free-choice for cattle and mixed herds',
      'Dairy and beef operations needing bulk mineral salt',
      'Seasonal supplementation in hot or dry climates',
    ],
  },
  'himalayan-salt-licks-horses': {
    displayName: 'Pink Salt Lick for Horses',
    metaTitle: 'Horse Salt Lick | Himalayan Koh',
    metaDescription:
      'Natural Himalayan salt licks for horses. Long-lasting, mineral-rich, and stall-friendly. From $9.95 — choose the size for your barn.',
  },
  'himalayan-salt-cattle-18lbs': {
    displayName: 'Cattle Rock Salt, 18 lb',
    metaTitle: 'Cattle Salt 18 lb Bag | Himalayan Koh',
    metaDescription:
      '18 lb bag of Himalayan rock salt for cattle. Unprocessed minerals for pasture herds. $49.95 — dependable ranch supply.',
  },
};

const GENERIC_DEFAULTS: Omit<ProductContent, 'displayName'> = {
  useCases: ['Cooking, seasoning, and natural mineral supplementation'],
  mineralHighlights: ['84+ trace minerals from ancient Himalayan deposits'],
  shippingInfo: SHARED_SHIPPING,
  trustIndicators: SHARED_TRUST,
  faqs: [
    {
      question: 'Where does Himalayan Koh salt come from?',
      answer:
        'Our salt is sourced from Himalayan deposits and selected for purity, mineral content, and consistent grain quality.',
    },
    {
      question: 'Do you offer bulk pricing?',
      answer: 'Yes — contact our team for quantity pricing on large orders.',
    },
  ],
};

type ContentBlocks = Omit<ProductContent, 'displayName'>;

function mergeContent(base: ContentBlocks, override?: Partial<ProductContent>): ContentBlocks {
  if (!override) return base;
  return {
    useCases: override.useCases ?? base.useCases,
    mineralHighlights: override.mineralHighlights ?? base.mineralHighlights,
    shippingInfo: override.shippingInfo ?? base.shippingInfo,
    trustIndicators: override.trustIndicators ?? base.trustIndicators,
    faqs: override.faqs ?? base.faqs,
    metaTitle: override.metaTitle ?? base.metaTitle,
    metaDescription: override.metaDescription ?? base.metaDescription,
  };
}

/** Readable short name for H1 and titles — avoids keyword-stuffed catalog names. */
export function getProductDisplayName(product: Product): string {
  const override = SLUG_OVERRIDES[product.slug]?.displayName;
  if (override) return override;

  let name = product.name
    .replace(/^Himalayan Koh\s+/i, '')
    .replace(/\b(Authentic|Pure Natural|Halal|Unprocessed)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const grainMatch = name.match(/,?\s*(Fine|Medium|Coarse)[^,)]*/i);
  if (name.length > 72 && grainMatch) {
    const short = name.split(/[,(]/)[0].trim();
    if (short.length >= 12 && short.length <= 72) name = `${short}${grainMatch[0]}`;
  }

  if (name.length > 72) {
    name = `${name.slice(0, 69).trim()}…`;
  }

  return name || product.name;
}

export function getProductContent(product: Product): ProductContent {
  const slugOverride = SLUG_OVERRIDES[product.slug];
  const categoryBase = CATEGORY_DEFAULTS[product.category] ?? GENERIC_DEFAULTS;
  const merged = mergeContent(categoryBase, slugOverride);

  return {
    displayName: slugOverride?.displayName ?? getProductDisplayName(product),
    metaTitle: slugOverride?.metaTitle ?? merged.metaTitle,
    metaDescription: slugOverride?.metaDescription ?? merged.metaDescription,
    useCases: merged.useCases,
    mineralHighlights: merged.mineralHighlights,
    shippingInfo: merged.shippingInfo,
    trustIndicators: merged.trustIndicators,
    faqs: merged.faqs,
  };
}
