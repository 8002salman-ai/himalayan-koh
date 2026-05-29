export interface BoxDimensions {
  lengthIn: number;
  widthIn: number;
  heightIn: number;
}

export interface PackingRule {
  id: string;
  label: string;
  unitWeightLbs: number;
  unitsPerBox: number;
  box: BoxDimensions;
  /** Checked before pattern matching — exact slug → rule id */
  slugs?: string[];
  /** First matching rule wins; checked in array order */
  matches: (product: { slug: string; name: string }) => boolean;
}

const BOX_10_10_6: BoxDimensions = { lengthIn: 10, widthIn: 10, heightIn: 6 };
const BOX_9_5_5_5: BoxDimensions = { lengthIn: 9.5, widthIn: 9.5, heightIn: 5.5 };
const BOX_30_BLOCK: BoxDimensions = { lengthIn: 8.5, widthIn: 7.5, heightIn: 6.5 };

function hasLb(text: string, pounds: number): boolean {
  const normalized = text.toLowerCase();
  const lb = `${pounds}\\s*(-|\\s)?lb`;
  const oz = pounds === 1 ? '16\\s*(-|\\s)?oz' : null;
  return new RegExp(`\\b(${lb}${oz ? `|${oz}` : ''})\\b`, 'i').test(normalized);
}

function hasLick(text: string): boolean {
  return /\blick(s)?\b/i.test(text);
}

function hasPouch(text: string): boolean {
  return /\bpouch(es)?\b/i.test(text);
}

function hasBlock(text: string): boolean {
  return /\bblock(s)?\b/i.test(text);
}

function hasJar(text: string): boolean {
  return /\bjar(s)?\b/i.test(text);
}

/**
 * Active Shippo packing rules — only these products get live carrier parcel math.
 * Order matters: more specific rules must appear first.
 */
export const ACTIVE_PACKING_RULES: PackingRule[] = [
  {
    id: 'jar-1lb-edible',
    label: '1 lb jar fine grain edible',
    unitWeightLbs: 1,
    unitsPerBox: 9,
    box: BOX_10_10_6,
    slugs: ['himalayan-pink-salt-16oz-jar'],
    matches: ({ slug, name }) => {
      const text = `${slug} ${name}`;
      return hasJar(text) && (hasLb(text, 1) || /16\s*oz/i.test(text));
    },
  },
  {
    id: 'lick-2lb',
    label: '2 lb licks',
    unitWeightLbs: 2,
    unitsPerBox: 6,
    box: BOX_10_10_6,
    matches: ({ slug, name }) => {
      const text = `${slug} ${name}`;
      return hasLb(text, 2) && hasLick(text) && !hasPouch(text) && !hasBlock(text);
    },
  },
  {
    id: 'lick-4lb',
    label: '4 lb licks',
    unitWeightLbs: 4,
    unitsPerBox: 4,
    box: BOX_10_10_6,
    matches: ({ slug, name }) => {
      const text = `${slug} ${name}`;
      return hasLb(text, 4) && hasLick(text) && !hasPouch(text) && !hasBlock(text);
    },
  },
  {
    id: 'lick-6lb',
    label: '6 lb licks',
    unitWeightLbs: 6,
    unitsPerBox: 4,
    box: BOX_9_5_5_5,
    matches: ({ slug, name }) => {
      const text = `${slug} ${name}`;
      return hasLb(text, 6) && hasLick(text) && !hasPouch(text) && !hasBlock(text);
    },
  },
  {
    id: 'block-30lb',
    label: '30 lb block',
    unitWeightLbs: 30,
    unitsPerBox: 1,
    box: BOX_30_BLOCK,
    matches: ({ slug, name }) => {
      const text = `${slug} ${name}`;
      return (
        hasLb(text, 30) &&
        !hasPouch(text) &&
        !hasJar(text) &&
        !/\bbag\b/i.test(text) &&
        (hasBlock(text) || /\b30\s*(-|\s)?lb\b/i.test(text))
      );
    },
  },
  {
    id: 'pouch-3lb-fine',
    label: '3 lb fine grain pouches',
    unitWeightLbs: 3,
    unitsPerBox: 6,
    box: BOX_10_10_6,
    matches: ({ slug, name }) => {
      const text = `${slug} ${name}`;
      return hasLb(text, 3) && hasPouch(text);
    },
  },
  {
    id: 'pouch-6lb-fine',
    label: '6 lb fine grain pouches',
    unitWeightLbs: 6,
    unitsPerBox: 3,
    box: BOX_10_10_6,
    slugs: ['himalayan-rock-salt-6lbs-pouch'],
    matches: ({ slug, name }) => {
      const text = `${slug} ${name}`;
      return hasLb(text, 6) && hasPouch(text);
    },
  },
];

const rulesById = new Map(ACTIVE_PACKING_RULES.map((rule) => [rule.id, rule]));

export function resolvePackingRule(product: {
  slug: string;
  name: string;
}): PackingRule | null {
  const slugKey = product.slug.trim().toLowerCase();
  for (const rule of ACTIVE_PACKING_RULES) {
    if (rule.slugs?.some((slug) => slug.toLowerCase() === slugKey)) {
      return rule;
    }
  }

  for (const rule of ACTIVE_PACKING_RULES) {
    if (rule.matches(product)) {
      return rule;
    }
  }

  return null;
}

export function getPackingRuleById(id: string): PackingRule | undefined {
  return rulesById.get(id);
}
