export interface Author {
  id: string;
  slug: string;
  name: string;
  role: string;
  expertise: string[];
  bio: string;
  avatar: string;
  credentials?: string;
  socials?: {
    linkedin?: string;
    email?: string;
  };
}

export const AUTHORS: Record<string, Author> = {
  'sourcing-team': {
    id: 'author-1',
    slug: 'sourcing-team',
    name: 'Himalayan Koh Sourcing & Supply Chain Team',
    role: 'Sourcing & Supply Chain Directorate',
    expertise: [
      'Geological Salt Sourcing',
      'Transatlantic Freight Logistics',
      'Quality Control & Granulometry',
      'Bulk Mineral Distribution',
    ],
    bio: 'The Himalayan Koh Sourcing & Supply Chain Team oversees direct mining partnerships in the Salt Range of northern Pakistan and bulk dispatch operations from Himalayan Koh’s Houston distribution warehouse. The team works closely with logistics partners to ensure raw rock salt and food-grade mineral products meet precise moisture, grading, and packaging specifications.',
    avatar: '/images/authors/sourcing-team.jpg',
    credentials: 'Sourcing & Supply Chain Directorate, Himalayan Koh LLC',
    socials: {
      email: 'sales@himalayankoh.com',
    },
  },
  'editorial-board': {
    id: 'author-2',
    slug: 'editorial-board',
    name: 'Himalayan Koh Editorial & Research Board',
    role: 'Technical Sourcing & Editorial Team',
    expertise: [
      'Agricultural Mineral Management',
      'Food Science & Culinary Salt Slabs',
      'Storage & Humidity Protocols',
      'Codex Alimentarius & ASTM Standards',
    ],
    bio: 'The Himalayan Koh Technical & Editorial Board synthesizes agricultural extension research, mineral chemistry data, and bulk warehouse handling procedures. Every guide is drafted with verified industry literature and reviewed against strict non-medical guidelines.',
    avatar: '/images/authors/board-placeholder.jpg',
    credentials: 'Technical & Agricultural Advisory Board',
    socials: {
      email: 'sales@himalayankoh.com',
    },
  },
  'agricultural-advisory': {
    id: 'author-3',
    slug: 'agricultural-advisory',
    name: 'Himalayan Koh Agricultural Nutrition Advisory',
    role: 'Livestock Mineral Nutrition Specialists',
    expertise: [
      'Equine Electrolyte Physiology',
      'Ruminant Sodium Balance',
      'Free-Choice Mineral Supplementation',
    ],
    bio: 'The Himalayan Koh Agricultural Nutrition Advisory specializes in large animal forage balance, sodium chloride supplementation strategies, and pasture lick placement for livestock operations.',
    avatar: '/images/authors/advisor-placeholder.jpg',
    credentials: 'Agricultural Nutrition Advisory, Himalayan Koh LLC',
  },
};

export function getAuthorBySlug(slug: string): Author | undefined {
  return AUTHORS[slug.toLowerCase()];
}

export function getAllAuthors(): Author[] {
  return Object.values(AUTHORS);
}
