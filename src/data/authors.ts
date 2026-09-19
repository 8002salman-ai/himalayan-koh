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
  'salman-ayaz': {
    id: 'author-1',
    slug: 'salman-ayaz',
    name: 'Salman Ayaz',
    role: 'Founder & Supply Chain Director',
    expertise: [
      'Geological Salt Sourcing',
      'Transatlantic Freight Logistics',
      'Quality Control & Granulometry',
      'Bulk Mineral Distribution',
    ],
    bio: 'Salman Ayaz oversees direct mining partnerships in the Salt Range of northern Pakistan and bulk dispatch operations from Himalayan Koh’s Houston distribution warehouse. He works closely with logistics partners to ensure raw rock salt and food-grade mineral products meet precise moisture, grading, and packaging specifications.',
    avatar: '/images/authors/salman-placeholder.jpg',
    credentials: 'Owner & Sourcing Lead, Himalayan Koh LLC',
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
  'dr-marcus-vance': {
    id: 'author-3',
    slug: 'dr-marcus-vance',
    name: 'Agricultural Nutrition Contributor (Placeholder)',
    role: 'Consulting Livestock Specialist',
    expertise: [
      'Equine Electrolyte Physiology',
      'Ruminant Sodium Balance',
      'Free-Choice Mineral Supplementation',
    ],
    bio: 'Consulting contributor specializing in large animal forage balance, sodium chloride supplementation strategies, and pasture lick placement. (Identity placeholder pending owner submission of formal advisory credentials).',
    avatar: '/images/authors/advisor-placeholder.jpg',
    credentials: 'DVM / Animal Nutrition Consultant (Pending Verification)',
  },
};

export function getAuthorBySlug(slug: string): Author | undefined {
  return AUTHORS[slug.toLowerCase()];
}

export function getAllAuthors(): Author[] {
  return Object.values(AUTHORS);
}
