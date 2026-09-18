import { legacyImage } from '@/lib/images/legacyAssets';
import type { CategoryContentBundle } from './types';
import type { CategoryContentKey } from './keys';

/**
 * Editorial content for each shop shelf: hero, gallery, guides, articles, PDFs.
 *
 * Keys are the shelf keys owned by `lib/catalog/niche.ts`, so a shelf cannot have
 * a hub page unless it is a real shelf the store stocks, and retiring a shelf
 * retires its hub with it.
 *
 * Two rules the copy follows:
 *
 *  - **Only pink salt imagery.** The legacy photographs of horses and cattle are
 *    deliberately not imported here; every image below shows salt or the kitchen.
 *  - **No invented products or prices.** A shelf describes what it is and how the
 *    salt is used. What is actually for sale, at what price and in what stock,
 *    comes from WooCommerce and nowhere else.
 */
const IMG = {
  saltBowl: legacyImage('bowlOfSalt'),
  pouch: legacyImage('saltPouch6lb'),
  jar: legacyImage('pinkSaltJar16oz'),
  rockBag: legacyImage('saltRockBag'),
};

export const CATEGORY_CONTENT_REGISTRY: Record<CategoryContentKey, CategoryContentBundle> = {
  'edible-pink-salt': {
    key: 'edible-pink-salt',
    productCategoryLabel: 'Edible Pink Salt',
    hero: {
      eyebrow: 'Kitchen & table',
      title: 'Edible Himalayan Pink Salt',
      subtitle:
        'Unrefined cooking salt with its natural trace minerals intact — fine for baking and brining, coarse for the grinder and the finish.',
    },
    seo: {
      title: 'Edible Himalayan Pink Salt — Fine & Coarse | Himalayan Koh',
      description:
        'Shop edible Himalayan pink salt in fine, medium and coarse grain. Mineral-rich and unprocessed, in jars, pouches and bulk bags for the kitchen.',
    },
    trustPoints: [
      { label: 'Unrefined crystals', detail: 'No anti-caking agents, no bleaching, nothing added.' },
      { label: 'Natural mineral colour', detail: 'The pink is iron the rock already held.' },
      { label: 'Packed for the kitchen', detail: 'Resealable jars, pouches and bags that keep salt dry.' },
    ],
    gallery: [
      { id: 'edible-bowl', src: IMG.saltBowl, alt: 'Bowl of pink Himalayan cooking salt crystals', width: 600, height: 450 },
      { id: 'edible-pouch', src: IMG.pouch, alt: 'Resealable pouch of Himalayan pink salt for home kitchens', width: 600, height: 450 },
      { id: 'edible-jar', src: IMG.jar, alt: 'Jar of Himalayan pink table salt', width: 500, height: 500 },
      { id: 'edible-rock', src: IMG.rockBag, alt: 'Coarse Himalayan rock salt in retail packaging', width: 600, height: 450 },
    ],
    articles: [
      {
        id: 'edible-brining',
        title: 'Brining with Himalayan Pink Salt',
        excerpt:
          'Why unrefined salt seasons evenly in a brine, and how grain size changes how fast it dissolves.',
        image: IMG.saltBowl,
        readTime: '4 min read',
        tag: 'Recipes',
      },
      {
        id: 'edible-minerals',
        title: 'What “84+ Trace Minerals” Actually Means',
        excerpt:
          'A practical read on the label claim, and why the pink colour reflects the iron the rock contains.',
        image: IMG.jar,
        readTime: '5 min read',
        tag: 'Guides',
      },
      {
        id: 'edible-grind',
        title: 'Fine, Medium or Coarse: Choosing Your Grain',
        excerpt: 'Match crystal size to your grinder, your baking and your finishing routine.',
        image: IMG.pouch,
        readTime: '3 min read',
        tag: 'Guides',
      },
    ],
    guides: [
      {
        id: 'kitchen-use',
        title: 'Kitchen Usage Guide',
        bullets: [
          'Fine grain: baking, soups and anywhere you want a fast dissolve',
          'Medium grain: all-purpose cooking and table grinders',
          'Coarse grain: finishing salt, rim salt and slow-release brines',
          'Store dry and airtight — steam is what makes salt clump',
        ],
      },
      {
        id: 'kitchen-storage',
        title: 'Storage & Shelf Life',
        bullets: [
          'Salt does not spoil; it only takes on moisture and odours',
          'Keep the pouch sealed and away from the stove',
          'A grain of rice in the grinder keeps fine salt flowing',
          'Refill small jars rather than dipping into the bulk bag',
        ],
      },
      {
        id: 'kitchen-faq',
        title: 'Edible Salt FAQs',
        faqs: [
          {
            question: 'Is pink salt iodised?',
            answer:
              'No. Himalayan pink salt is unrefined and carries its naturally occurring minerals, not added iodine.',
          },
          {
            question: 'Can I cook with the coarse grade?',
            answer:
              'Yes — coarse crystals are for finishing, grinding and long cooks. For baking, where salt has to disappear, use fine.',
          },
        ],
      },
    ],
    pdfs: [
      {
        id: 'grain-size-guide',
        title: 'Grain Size Guide',
        description: 'Which grain to reach for, for baking, brining, grinding and finishing.',
        url: '/resources/grain-size-guide.pdf',
        fileSize: '140 KB',
        publishedAt: '2026-03-01',
      },
    ],
    emptyStates: {},
  },

  'cooking-serving': {
    key: 'cooking-serving',
    productCategoryLabel: 'Cooking & Serving',
    hero: {
      eyebrow: 'Grill, chill, serve',
      title: 'Salt Blocks & Serving Plates',
      subtitle:
        'Thick slabs of pink salt that hold heat in the oven, hold cold on the table, and season what rests on them.',
    },
    seo: {
      title: 'Himalayan Pink Salt Blocks & Serving Plates | Himalayan Koh',
      description:
        'Himalayan pink salt blocks and plates for the grill, the oven and the table. Heat them, chill them, serve on them — natural salt seasoning with no additives.',
    },
    trustPoints: [
      { label: 'Solid salt, not coated', detail: 'Cut from the same mineral rock as our edible grades.' },
      { label: 'Heat and chill', detail: 'Oven, grill and freezer safe with the right handling.' },
      { label: 'Seasoning as you serve', detail: 'A gentle salt edge rather than an instant hit.' },
    ],
    gallery: [
      { id: 'block-slab', src: IMG.rockBag, alt: 'Large blocks of pink Himalayan salt packed for shipping', width: 600, height: 450 },
      { id: 'block-bowl', src: IMG.saltBowl, alt: 'Coarse pink salt crystals from a serving block', width: 600, height: 450 },
      { id: 'block-jar', src: IMG.jar, alt: 'Ground pink salt for finishing at the table', width: 500, height: 500 },
      { id: 'block-pouch', src: IMG.pouch, alt: 'Pink salt pouch beside a serving block', width: 600, height: 450 },
    ],
    articles: [
      {
        id: 'block-heat',
        title: 'Heating a Salt Block Without Cracking It',
        excerpt: 'Why the warm-up has to be slow, and how to come back down after the cook.',
        image: IMG.rockBag,
        readTime: '5 min read',
        tag: 'Technique',
      },
      {
        id: 'block-chill',
        title: 'The Cold Side: Chilling and Serving',
        excerpt: 'Freeze the plate, shave, plate the dessert — salt on the cold side of the kitchen.',
        image: IMG.saltBowl,
        readTime: '4 min read',
        tag: 'Technique',
      },
      {
        id: 'block-care',
        title: 'Cleaning and Storing Salt Blocks',
        excerpt: 'What to wipe, what never to soak, and how to stop a block from leaching into the shelf.',
        image: IMG.pouch,
        readTime: '3 min read',
        tag: 'Care',
      },
    ],
    guides: [
      {
        id: 'block-techniques',
        title: 'Cooking Techniques',
        bullets: [
          'Warm the block gradually — cold block to hot grill is how they crack',
          'Sear on the hot block, finish off it, then scrape clean while warm',
          'Chill for charcuterie, sushi and cold service',
          'Use separate blocks for raw meat and for anything served raw',
        ],
      },
      {
        id: 'block-handling',
        title: 'Handling & Care',
        bullets: [
          'Wipe with a damp cloth — never submerge a block in water',
          'Let the block cool fully before cleaning',
          'Store in a dry place; salt draws moisture from the air',
          'Thin plates are for serving, thick slabs are for cooking',
        ],
      },
      {
        id: 'block-faq',
        title: 'Salt Block FAQs',
        faqs: [
          {
            question: 'How salty does food get?',
            answer:
              'It picks up a gentle salt edge, most on moist food left in contact the longest. Move it off the block when it tastes right.',
          },
          {
            question: 'How many times can I reuse a block?',
            answer:
              'Many — years with care. Once it is badly cracked or pitted it stays a serving piece rather than a cooking surface.',
          },
        ],
      },
    ],
    pdfs: [
      {
        id: 'salt-block-guide',
        title: 'Salt Block Handling Guide',
        description: 'Warm-up schedules, cleaning method and what to avoid.',
        url: '/resources/salt-block-guide.pdf',
        fileSize: '180 KB',
        publishedAt: '2026-03-10',
      },
    ],
    emptyStates: {},
  },

  'licks-blocks': {
    key: 'licks-blocks',
    productCategoryLabel: 'Salt Licks & Blocks',
    hero: {
      eyebrow: 'Solid pink salt',
      title: 'Salt Licks & Blocks',
      subtitle:
        'Solid pieces of Himalayan pink salt from the Khewra range, supplied in the weights our price list states.',
    },
    seo: {
      title: 'Himalayan Pink Salt Licks & Blocks | Himalayan Koh',
      description:
        'Solid Himalayan pink salt licks and blocks from the Khewra range, in the weights our price list covers. Packed in Houston and shipped across the U.S.',
    },
    trustPoints: [
      { label: 'Solid salt, not coated', detail: 'Cut from the same mineral rock as our edible grades.' },
      { label: 'Weight as listed', detail: 'Sold at the weight the product line states.' },
      { label: 'Packed in Houston', detail: 'Ships from our Texas warehouse in 1–2 business days.' },
    ],
    gallery: [
      { id: 'lick-rock', src: IMG.rockBag, alt: 'Large pieces of solid pink Himalayan salt', width: 600, height: 450 },
      { id: 'lick-bowl', src: IMG.saltBowl, alt: 'Coarse pink salt crystals beside a solid salt piece', width: 600, height: 450 },
    ],
    // Empty on purpose. These collections are content, and inventing guides or
    // articles about a range the owner has only just authorised would be exactly
    // the kind of unverified claim this migration has been removing. The shelf
    // says so in its own empty states instead of rendering nothing.
    guides: [],
    articles: [],
    pdfs: [],
    emptyStates: {
      guides: 'Handling guides for this range are being written.',
      articles: 'Articles for this range are coming soon.',
      pdfs: 'No downloads are published for this range yet.',
    },
  },

  'lamps-decor': {
    key: 'lamps-decor',
    productCategoryLabel: 'Salt Lamps & Décor',
    hero: {
      eyebrow: 'Home & light',
      title: 'Himalayan Salt Lamps & Décor',
      subtitle:
        'Lamps, candle holders and carved pieces cut from pink salt — a warm amber light and a mineral object for the room.',
    },
    seo: {
      title: 'Himalayan Salt Lamps & Décor | Himalayan Koh',
      description:
        'Hand-carved Himalayan pink salt lamps, candle holders and décor. Natural mineral pieces with a warm amber glow, complete with dimmable cords where fitted.',
    },
    trustPoints: [
      { label: 'Carved from the rock', detail: 'Each piece keeps its own grain, colour and veins.' },
      { label: 'Fitted cords', detail: 'Lamps ship with a dimmable cord where the product includes one.' },
      { label: 'Made for a dry room', detail: 'Salt lamps like steady air and a place to breathe.' },
    ],
    gallery: [
      { id: 'lamp-rock', src: IMG.rockBag, alt: 'Salt rock used to carve Himalayan salt lamps', width: 600, height: 450 },
      { id: 'lamp-jar', src: IMG.jar, alt: 'Ground pink salt beside a salt lamp at home', width: 500, height: 500 },
      { id: 'lamp-bowl', src: IMG.saltBowl, alt: 'Coarse pink Himalayan salt crystals', width: 600, height: 450 },
      { id: 'lamp-pouch', src: IMG.pouch, alt: 'Pink salt pouch packed alongside a salt lamp order', width: 600, height: 450 },
    ],
    articles: [
      {
        id: 'lamp-placement',
        title: 'Where to Put a Salt Lamp',
        excerpt: 'Airflow, proximity to the wall, and the rooms a lamp can handle without sweating.',
        image: IMG.rockBag,
        readTime: '4 min read',
        tag: 'Home',
      },
      {
        id: 'lamp-care',
        title: 'Keeping a Salt Lamp Dry',
        excerpt: 'In humid weather a salt lamp attracts moisture. Here is what to do about it.',
        image: IMG.saltBowl,
        readTime: '3 min read',
        tag: 'Care',
      },
      {
        id: 'lamp-truth',
        title: 'What Salt Lamps Do — and What They Do Not',
        excerpt: 'An honest look at the claims made for salt lamps, and the ones we can stand behind.',
        image: IMG.jar,
        readTime: '5 min read',
        tag: 'Guides',
      },
    ],
    guides: [
      {
        id: 'lamp-setup',
        title: 'Setting Up a Salt Lamp',
        bullets: [
          'Keep it on a saucer — salt likes to leave a ring',
          'Leave a hand-width of space behind it for air movement',
          'Use the dimmer to lift moisture out of the piece',
          'Keep it away from running water and open windows in wet weather',
        ],
      },
      {
        id: 'lamp-care-guide',
        title: 'Care & Maintenance',
        bullets: [
          'Wipe with a dry or barely damp cloth only',
          'Leave the lamp lit for a few hours if it feels clammy',
          'Bulbs and cords are replaceable — match the fitting',
          'Handle with both hands; the pieces are heavier than they look',
        ],
      },
      {
        id: 'lamp-faq',
        title: 'Salt Lamp FAQs',
        faqs: [
          {
            question: 'Why is my lamp wet?',
            answer:
              'Salt draws moisture from humid air. Leave it lit for a few hours and the warmth evaporates it; if the room stays damp, move the lamp.',
          },
          {
            question: 'Is every lamp the same colour?',
            answer:
              'No. Iron content varies through the seam, so shade and veining differ from piece to piece.',
          },
        ],
      },
    ],
    pdfs: [
      {
        id: 'salt-lamp-care',
        title: 'Salt Lamp Care Sheet',
        description: 'Placement, moisture handling and bulb replacement.',
        url: '/resources/salt-lamp-care.pdf',
        fileSize: '150 KB',
        publishedAt: '2026-03-15',
      },
    ],
    emptyStates: {},
  },

  bulk: {
    key: 'bulk',
    productCategoryLabel: 'Bulk & Wholesale',
    hero: {
      eyebrow: 'Kitchen, retail & gifting',
      title: 'Bulk Himalayan Pink Salt',
      subtitle:
        'Bigger bags, pouches in multi-packs and wholesale quantities of the same unrefined salt, for kitchens and shops that get through it.',
    },
    seo: {
      title: 'Bulk Himalayan Pink Salt — Bags & Wholesale | Himalayan Koh',
      description:
        'Buy Himalayan pink salt in bulk: large bags and multi-pack pouches of unrefined edible salt for kitchens, retailers and wholesale orders.',
    },
    trustPoints: [
      { label: 'Same rock, bigger bag', detail: 'Bulk grades are drawn from the same seam as the retail jars.' },
      { label: 'Stores for years', detail: 'Kept dry and sealed, salt does not go off.' },
      { label: 'Wholesale on request', detail: 'Recurring supply and larger quantities — ask us.' },
    ],
    gallery: [
      { id: 'bulk-rock', src: IMG.rockBag, alt: 'Large bag of Himalayan rock salt in bulk packaging', width: 600, height: 450 },
      { id: 'bulk-pouch', src: IMG.pouch, alt: 'Multi-pack pouches of pink Himalayan salt', width: 600, height: 450 },
      { id: 'bulk-bowl', src: IMG.saltBowl, alt: 'Bowl of coarse pink salt from a bulk bag', width: 600, height: 450 },
      { id: 'bulk-jar', src: IMG.jar, alt: 'Retail jar of pink salt for refilling from bulk stock', width: 500, height: 500 },
    ],
    articles: [
      {
        id: 'bulk-storage',
        title: 'Storing Bulk Salt Without Clumping',
        excerpt: 'Food-grade containers, humidity and why the garage is a bad idea in a wet climate.',
        image: IMG.rockBag,
        readTime: '4 min read',
        tag: 'Storage',
      },
      {
        id: 'bulk-refill',
        title: 'Refilling Retail Jars from Bulk Stock',
        excerpt: 'A simple kitchen or shop workflow that keeps one bulk bag clean and one jar on the shelf.',
        image: IMG.pouch,
        readTime: '3 min read',
        tag: 'Operations',
      },
      {
        id: 'bulk-wholesale',
        title: 'Ordering Wholesale: What We Need From You',
        excerpt: 'Volumes, lead time and shipping — how a wholesale order is put together.',
        image: IMG.jar,
        readTime: '3 min read',
        tag: 'Wholesale',
      },
    ],
    guides: [
      {
        id: 'bulk-buying',
        title: 'Choosing a Bulk Size',
        bullets: [
          'Count households or servings per week, not per year',
          'Small kitchens: multi-pack pouches keep salt dry between refills',
          'Retail: large bags plus retail jars to refill from',
          'Wholesale: tell us the volume and repeat schedule and we quote it',
        ],
      },
      {
        id: 'bulk-storage-guide',
        title: 'Storage Guidance',
        bullets: [
          'Keep bulk bags closed and off a concrete floor',
          'Store away from coffee, spices and anything with a strong smell',
          'Use a clean dry scoop — never a wet one',
          'Decant into a small jar rather than leaving the bag open',
        ],
      },
      {
        id: 'bulk-faq',
        title: 'Bulk Orders FAQs',
        faqs: [
          {
            question: 'Do you offer wholesale pricing?',
            answer:
              'Yes. Contact us with the volume, the grain size and how often you need it, and we will quote the order.',
          },
          {
            question: 'How long does bulk salt last?',
            answer:
              'Indefinitely while it stays dry. Salt is a preservative; it does not spoil, it only picks up moisture or odours.',
          },
        ],
      },
    ],
    pdfs: [
      {
        id: 'bulk-storage-sheet',
        title: 'Bulk Storage & Refill Sheet',
        description: 'Container guidance, humidity notes and a refill workflow for retail shelves.',
        url: '/resources/bulk-storage-sheet.pdf',
        fileSize: '160 KB',
        publishedAt: '2026-03-05',
      },
    ],
    emptyStates: {},
  },
};
