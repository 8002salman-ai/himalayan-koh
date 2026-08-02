import type { Product } from '../../../data/products';
import { getProductContent } from '../productContent';
import { isLivestockPdpProduct } from './categories';
import type { PdpAccordionArticle } from './types';

const HORSE_BENEFITS: PdpAccordionArticle = {
  id: 'benefits-horses',
  title: 'Benefits for Horses',
  bullets: [
    'Supports electrolyte balance during training, travel, and hot weather',
    'Encourages natural licking — reducing boredom in stalls and paddocks',
    'Delivers calcium, magnesium, potassium, and trace minerals without pressed additives',
    'Hard, long-lasting crystal structure compared to many manufactured blocks',
  ],
  paragraphs: [
    'Horses seek out salt when their diet or workload increases mineral demand. A clean, natural lick gives them free-choice access so intake self-regulates with need and weather.',
  ],
};

const CATTLE_BENEFITS: PdpAccordionArticle = {
  id: 'benefits-horses',
  title: 'Benefits for Livestock',
  bullets: [
    'Free-choice minerals for cattle on pasture or in dry lot',
    'Supports hydration and normal electrolyte function in heat and transport',
    'Unrefined crystal salt — no anti-caking agents or added binders',
    'Suitable for mixed herds when offered in covered feeders',
  ],
  paragraphs: [
    'Cattle and horses both benefit from consistent mineral access. Himalayan rock salt encourages natural consumption patterns compared with flavor-fortified blocks.',
  ],
};

const SAFE_USE: PdpAccordionArticle = {
  id: 'safe-use',
  title: 'How to Use Salt Licks Safely',
  bullets: [
    'Mount in a licensed holder or hang with heavy-duty rope — never loose in walkways',
    'Place in a dry, shaded area with fresh water available at all times',
    'Introduce gradually if horses are new to loose salt or large licks',
    'Monitor intake; consult your veterinarian for horses on restricted diets',
    'Keep separate licks for large herds to reduce competition and injury risk',
  ],
};

const MINERAL_COMPOSITION: PdpAccordionArticle = {
  id: 'mineral-composition',
  title: 'Mineral Composition',
  paragraphs: [
    'Himalayan pink salt is formed from ancient sea deposits and retains a broad trace mineral profile — often cited as 84+ elements in naturally varying amounts.',
  ],
  bullets: [
    'Primary component: sodium chloride (NaCl) for essential electrolyte needs',
    'Notable traces: calcium, magnesium, potassium, iron, and zinc (levels vary by harvest)',
    'No iodization unless separately specified — check product labeling for your program',
    'Unprocessed crystals; color reflects natural iron and mineral content',
  ],
};

const STORAGE_PLACEMENT: PdpAccordionArticle = {
  id: 'storage-placement',
  title: 'Storage and Placement Tips',
  bullets: [
    'Store sealed bags in a cool, dry place before opening',
    'Use covered feeders outdoors to limit rain pooling on rock salt',
    'Elevate licks off bare soil to reduce grit and waste',
    'Rotate placement occasionally in large pastures so subordinate animals get access',
    'Inspect holders regularly for wear, frayed rope, or sharp edges',
  ],
};

const SLUG_ARTICLE_OVERRIDES: Record<string, Partial<PdpAccordionArticle>[]> = {
  'himalayan-livestock-salt-45lbs': [
    {
      id: 'safe-use',
      title: 'How to Use Bulk Salt Safely',
      bullets: [
        'Offer in sturdy covered feeders — not directly on muddy ground',
        'Split large bags across multiple stations for big herds',
        'Ensure unlimited fresh water, especially after heavy consumption',
        'Follow your nutritionist’s guidance for dairy or feedlot programs',
      ],
    },
  ],
};

function visibleOnly(articles: PdpAccordionArticle[]): PdpAccordionArticle[] {
  return articles.filter((a) => a.visible !== false);
}

function buildFaqArticle(product: Product): PdpAccordionArticle {
  const { faqs } = getProductContent(product);
  return {
    id: 'faqs',
    title: 'FAQs',
    faqs: faqs.length > 0 ? faqs : [
      {
        question: 'Where does Himalayan Koh salt come from?',
        answer:
          'Our salt is selected from Himalayan deposits for purity, mineral content, and consistent grain or crystal quality.',
      },
      {
        question: 'Do you offer wholesale or ranch pricing?',
        answer: 'Yes — contact us for bulk quotes on large bags and repeat orders.',
      },
    ],
  };
}

function baseArticles(product: Product): PdpAccordionArticle[] {
  const isHorse = product.category === 'Salt Lick for Horses';
  const benefits = isHorse ? HORSE_BENEFITS : CATTLE_BENEFITS;

  const articles: PdpAccordionArticle[] = [
    benefits,
    SAFE_USE,
    MINERAL_COMPOSITION,
    STORAGE_PLACEMENT,
    buildFaqArticle(product),
  ];

  const overrides = SLUG_ARTICLE_OVERRIDES[product.slug];
  if (!overrides) return articles;

  return articles.map((article) => {
    const patch = overrides.find((o) => o.id === article.id);
    return patch ? { ...article, ...patch } : article;
  });
}

/** Accordion articles for livestock PDPs; empty for edible/cooking products. */
export function getPdpAccordionArticles(product: Product): PdpAccordionArticle[] {
  if (!isLivestockPdpProduct(product)) return [];
  return visibleOnly(baseArticles(product));
}
