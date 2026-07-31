import { legacyImage } from '@/lib/images/legacyAssets';

export interface Product {
  id: number | string;
  slug: string;
  name: string;
  price: string;
  priceRange?: boolean;
  isFeatured?: boolean;
  priceMin: number;
  priceMax?: number;
  image: string;
  category: string;
  description?: string;
  grainSizes?: string[];
  inStock: boolean;
  metaTitle?: string;
  metaDescription?: string;
}

// Demo fallback catalog used when Supabase environment variables are not configured.

export interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  image: string;
  date: string;
  category: string;
  author: string;
  readTime: string;
}

export interface GalleryImage {
  src: string;
  alt: string;
  category: string;
}

export const products: Product[] = [
  {
    id: 1,
    slug: 'himalayan-edible-pink-salt-fine',
    name: "Himalayan Koh Authentic Pure Natural Halal Unprocessed Himalayan Edible Pink Cooking Salt, Fine Grain (0.5mm to 1mm)",
    price: "$9.95 – $17.95",
    priceRange: true,
    isFeatured: true,
    priceMin: 9.95,
    priceMax: 17.95,
    image: legacyImage('saltPouch6lb'),
    category: "Edible Cooking Salt",
    description: "Experience the pure essence of the Himalayas with our Authentic Pure Natural Halal Unprocessed Himalayan Edible Pink Cooking Salt, available in fine grain (0.5mm to 1mm). Our premium salt is 100% natural and completely unrefined – no additives, anti-caking agents, flow agents, or chemicals of any kind. Each crystal is rich in over 80 essential trace minerals including potassium, magnesium, calcium, and iron that support optimal health. Perfect for everyday cooking, gourmet recipes, bath soaks, salt lamps, and wellness applications. Kosher certified and vegan friendly. Our fine grain salt dissolves quickly and blends seamlessly into any dish. Backed by our quality guarantee, this authentic Himalayan salt brings both flavor and nutrition to your table.",
    grainSizes: ["Fine (0.5mm-1mm)", "Medium (1mm-2mm)", "Coarse (2mm-5mm)"],
    inStock: true,
  },
  {
    id: 2,
    slug: 'himalayan-pink-salt-16oz-jar',
    name: "Himalayan Edible Pink Salt – 16 oz Jar",
    price: "$9.95",
    priceMin: 9.95,
    image: legacyImage('pinkSaltJar16oz'),
    category: "Edible Cooking Salt",
    description: "Discover culinary excellence with our Himalayan Edible Pink Salt in a convenient 16 oz glass jar. This premium hand-selected salt features perfectly preserved pink hue and natural mineral content. Ideal for everyday cooking, seasoning, and table use. Each crystal contains trace minerals that enhance not just flavor, but overall wellness. The 16 oz size is perfect for home kitchens and frequent cooks. Use it to season vegetables, proteins, and grains, or place it on your dining table for elegant presentation. Our Himalayan salt elevates simple meals into gourmet experiences while providing natural mineral supplementation in every pinch.",
    grainSizes: ["Fine", "Coarse"],
    inStock: true,
  },
  {
    id: 3,
    slug: 'himalayan-rock-salt-6lbs-pouch',
    name: "Himalayan Rock Salt Pouches in Fine and Coarse Grain Sizes – 6 lbs",
    price: "$17.95",
    priceMin: 17.95,
    image: legacyImage('saltRockBag'),
    category: "Edible Cooking Salt",
    description: "Unlock the full potential of premium Himalayan salt with our 6 lb Rock Salt Pouches, available in both fine and coarse grain sizes. Perfect for cooking enthusiasts, health-conscious consumers, and wholesale buyers, this bulk option offers excellent value without compromising quality. The coarse grain works beautifully for salt-roasting vegetables and meats, while the fine grain dissolves quickly for everyday cooking. Our 6 lb pouch represents an investment in your kitchen's flavor profile and your family's nutritional wellness. Rich in 80+ trace minerals, every gram supports hydration and mineral balance. Sourced directly from ancient Himalayan deposits and carefully processed to preserve purity.",
    grainSizes: ["Fine", "Coarse"],
    inStock: true,
  },
  {
    id: 4,
    slug: 'himalayan-livestock-salt-45lbs',
    name: "Bag of Himalayan Pink Salt for Livestock (45 lbs.)",
    price: "$99.95",
    priceMin: 99.95,
    image: legacyImage('cattleSaltBag'),
    category: "Salt for Cattle",
    description: "Support your cattle's health with our Bag of Himalayan Pink Salt for Livestock – the premium 45 lb bag designed specifically for herds. Cattle require consistent access to quality salt and essential minerals for optimal growth, reproduction, and milk production. Our Himalayan pink salt provides over 80 natural trace minerals that commercial white salt cannot match. The 45 lb size is ideal for medium to large operations, offering cost-effective bulk pricing. Encourage natural consumption by offering free-choice access in a weather-protected location. Unlike processed alternatives, our salt contains no additives or fillers – just pure Himalayan minerals your livestock crave.",
    inStock: true,
  },
  {
    id: 5,
    slug: 'himalayan-salt-licks-horses',
    name: "Himalayan Pink Salt Licks for Horses",
    price: "$9.95 – $14.95",
    priceRange: true,
    priceMin: 9.95,
    priceMax: 14.95,
    image: legacyImage('horseLickPaddock'),
    category: "Salt Lick for Horses",
    description: "Enhance your horse's health and wellbeing with our Himalayan Pink Salt Licks for Horses – specially formulated to support equine nutrition. Horses instinctively seek salt for its essential electrolytes and minerals. Our natural salt lick provides over 84 trace minerals that support muscular function, hydration, and coat quality. Perfect for paddock and stable use, these licks encourage natural licking behavior while meeting nutritional needs. Each lick is weather-resistant and long-lasting. Ideal for riding horses, working horses, and pleasure animals. Available in various sizes to match your facility's needs.",
    inStock: true,
  },
  {
    id: 6,
    slug: 'himalayan-salt-cattle-18lbs',
    name: "Himalayan Salt Rock for Cattle 18 Lbs Bag",
    price: "$49.95",
    priceMin: 49.95,
    image: legacyImage('cattleSaltBag'),
    category: "Salt for Cattle",
    description: "Provide essential nutrition to your cattle with our Himalayan Salt Rock for Cattle – the natural 18 lb bag that outperforms ordinary salt blocks. Natural and completely unprocessed, our Himalayan salt rock contains 80+ trace minerals vital for cattle growth, milk production, and overall herd health. The 18 lb bag is perfect for smaller operations and supplemental feeding. Place in pastures or pens where cattle have easy access. Unlike synthetic mineral blocks, our pure salt rock is completely free from additives. Cattle naturally regulate their salt intake – offer unlimited access alongside fresh water for optimal results.",
    inStock: true,
  },
  {
    id: 7,
    slug: 'himalayan-6lb-trace-mineral-salt-block',
    name: 'Himalayan Salt Block — Essential Trace Minerals, 6 lb',
    price: '$40.00',
    priceMin: 40,
    image: '/images/products/white-background/himalayan-6lb-salt-lick-front-white.webp',
    category: 'Salt Lick for Horses',
    description: "Invest in your livestock's wellbeing with our Himalayan Salt Block – Essential Trace Minerals, 6 lb size that delivers superior nutrition. This expertly compressed 6 lb Himalayan salt lick is formulated for horses, cows, goats, deer, sheep, llamas, alpacas, and other livestock. Each block contains over 84 essential trace minerals that support muscle development, immune function, and metabolic health. Horses love the natural taste, encouraging healthy licking behavior that promotes jaw strength and dental health. Place in your stable, paddock, or pasture – weather-resistant and long-lasting. Ensure animals always have access to clean, fresh drinking water. Perfect for small operations or supplemental feeding programs.",
    inStock: true,
  },
  {
    id: 8,
    slug: 'himalayan-2lb-round-rope-salt-lick',
    name: 'Himalayan Round Rope Salt Lick — Essential Trace Minerals, 2 lb',
    price: '$40.00',
    priceMin: 40,
    image: '/images/products/white-background/himalayan-round-rope-salt-lick-front-white.webp',
    category: 'Salt Lick for Horses',
    description: "Experience convenient mineral supplementation with our Himalayan Round Rope Salt Lick – Essential Trace Minerals, 2 lb size with integrated rope for easy installation. The rope allows flexible placement in stalls, paddocks, or run-in sheds. This 2 lb round lick is ideal for individual horses or as a supplemental mineral source. Horses and livestock naturally seek out salt for its essential electrolytes and 84+ trace minerals. The compact 2 lb size is easy to manage and replace. Weather-resistant and durable construction ensures long-lasting use. Rope attachment prevents loss and keeps the lick at optimal height for comfortable access. Always provide fresh drinking water.",
    inStock: true,
  },
  {
    id: 9,
    slug: 'himalayan-6lb-round-rope-salt-lick',
    name: 'Himalayan Round Rope Salt Lick — Essential Trace Minerals, 6 lb',
    price: '$40.00',
    priceMin: 40,
    image: '/images/products/white-background/himalayan-round-rope-salt-lick-front-white.webp',
    category: 'Salt Lick for Horses',
    description: "Optimize nutritional support for your entire herd with our Himalayan Round Rope Salt Lick – Essential Trace Minerals, 6 lb premium version. Double the mineral content of our 2 lb option, this 6 lb round lick with rope attachment serves multiple animals or provides extended supplementation. Perfectly sized for barns, pastures, and run-in sheds. The integrated rope enables secure hanging at ideal consumption height. All livestock benefit from the 80+ natural minerals: horses maintain coat and muscle quality, cattle improve milk production, and other animals enjoy enhanced overall health. Weather-resistant exterior ensures durability through all seasons. Complement with our other salt products for comprehensive mineral management.",
    inStock: true,
  },
];

export const categories = [
  {
    name: "Salt Blocks for Deer",
    image: legacyImage('horseLickPaddock'),
    description: "Optimize nutritional support for your entire herd with our Himalayan Round Rope Salt Lick – Essential Trace Minerals, 6 lb premium version. Double the mineral content of our 2 lb option, this 6 lb round lick with rope attachment serves multiple animals or provides extended supplementation. Perfectly sized for barns, pastures, and run-in sheds. The integrated rope enables secure hanging at ideal consumption height. All livestock benefit from the 80+ natural minerals: horses maintain coat and muscle quality, cattle improve milk production, and other animals enjoy enhanced overall health. Weather-resistant exterior ensures durability through all seasons. Complement with our other salt products for comprehensive mineral management.",
  },
  {
    name: "Salt Lumps for Cattle",
    image: legacyImage('saltRockBag'),
    description: "Optimize nutritional support for your entire herd with our Himalayan Round Rope Salt Lick – Essential Trace Minerals, 6 lb premium version. Double the mineral content of our 2 lb option, this 6 lb round lick with rope attachment serves multiple animals or provides extended supplementation. Perfectly sized for barns, pastures, and run-in sheds. The integrated rope enables secure hanging at ideal consumption height. All livestock benefit from the 80+ natural minerals: horses maintain coat and muscle quality, cattle improve milk production, and other animals enjoy enhanced overall health. Weather-resistant exterior ensures durability through all seasons. Complement with our other salt products for comprehensive mineral management.",
  },
  {
    name: "Salt Lick for Horses",
    image: legacyImage('horseLicking'),
    description: "Optimize nutritional support for your entire herd with our Himalayan Round Rope Salt Lick – Essential Trace Minerals, 6 lb premium version. Double the mineral content of our 2 lb option, this 6 lb round lick with rope attachment serves multiple animals or provides extended supplementation. Perfectly sized for barns, pastures, and run-in sheds. The integrated rope enables secure hanging at ideal consumption height. All livestock benefit from the 80+ natural minerals: horses maintain coat and muscle quality, cattle improve milk production, and other animals enjoy enhanced overall health. Weather-resistant exterior ensures durability through all seasons. Complement with our other salt products for comprehensive mineral management.",
  },
  {
    name: "Edible Cooking Salt",
    image: legacyImage('bowlOfSalt'),
    description: "Optimize nutritional support for your entire herd with our Himalayan Round Rope Salt Lick – Essential Trace Minerals, 6 lb premium version. Double the mineral content of our 2 lb option, this 6 lb round lick with rope attachment serves multiple animals or provides extended supplementation. Perfectly sized for barns, pastures, and run-in sheds. The integrated rope enables secure hanging at ideal consumption height. All livestock benefit from the 80+ natural minerals: horses maintain coat and muscle quality, cattle improve milk production, and other animals enjoy enhanced overall health. Weather-resistant exterior ensures durability through all seasons. Complement with our other salt products for comprehensive mineral management.",
  },
];

export const blogPosts: BlogPost[] = [
  {
    id: 1,
    title: "Why do dairy cows need trace minerals?",
    excerpt: "Discover the essential role trace minerals play in dairy cow health, milk production, and overall farm productivity. Learn how Himalayan salt can provide these vital nutrients naturally.",
    image: legacyImage('cattleGrazing'),
    date: "March 15, 2026",
    category: "Livestock Health",
    author: "Dr. Sarah Mitchell",
    readTime: "5 min read",
  },
  {
    id: 2,
    title: "Himalayan Pink Vs. White Salt – Why Farmers Are Switching",
    excerpt: "Learn why more ranchers and farmers are choosing Himalayan pink salt over traditional white salt for their livestock. The benefits go beyond just minerals.",
    image: legacyImage('bowlOfSalt'),
    date: "February 28, 2026",
    category: "Industry Insights",
    author: "James Anderson",
    readTime: "7 min read",
  },
  {
    id: 3,
    title: "How to Choose the Right Salt Lick for Your Horses",
    excerpt: "A comprehensive guide to selecting the perfect salt lick for your equine companions. Size, placement, and mineral content all matter for horse health.",
    image: legacyImage('horseLickPaddock'),
    date: "February 10, 2026",
    category: "Horse Care",
    author: "Emily Roberts",
    readTime: "6 min read",
  },
  {
    id: 4,
    title: "The Science Behind 84 Trace Minerals",
    excerpt: "Dive deep into the science of Himalayan pink salt and understand why these 84 trace minerals are so beneficial for livestock health and productivity.",
    image: legacyImage('saltRockBag'),
    date: "January 22, 2026",
    category: "Research",
    author: "Dr. Michael Chen",
    readTime: "8 min read",
  },
  {
    id: 5,
    title: "Bulk Buying Guide for Ranch Owners",
    excerpt: "Everything you need to know about purchasing Himalayan salt in bulk for your ranch. Storage tips, quantity guidelines, and cost savings explained.",
    image: legacyImage('cattleSaltBag'),
    date: "January 8, 2026",
    category: "Guides",
    author: "Tom Williams",
    readTime: "4 min read",
  },
  {
    id: 6,
    title: "Winter Nutrition Tips for Cattle",
    excerpt: "Keep your cattle healthy through the winter months with proper salt and mineral supplementation. Expert tips from experienced ranchers.",
    image: legacyImage('horseLicking'),
    date: "December 15, 2025",
    category: "Seasonal Care",
    author: "Robert Davis",
    readTime: "5 min read",
  },
];

export const galleryImages: GalleryImage[] = [
  {
    src: legacyImage('horseLickPaddock'),
    alt: "Horse licking Himalayan salt",
    category: "Horses",
  },
  {
    src: legacyImage('saltRockBag'),
    alt: "Himalayan salt products",
    category: "Products",
  },
  {
    src: legacyImage('bowlOfSalt'),
    alt: "Bowl of Himalayan salt",
    category: "Products",
  },
  {
    src: legacyImage('cattleSaltBag'),
    alt: "Himalayan salt bags",
    category: "Products",
  },
  {
    src: legacyImage('horseLicking'),
    alt: "Horse with salt lick",
    category: "Horses",
  },
  {
    src: legacyImage('cattleGrazing'),
    alt: "Livestock grazing",
    category: "Cattle",
  },
  {
    src: legacyImage('pinkSaltJar16oz'),
    alt: "Pink salt jar",
    category: "Products",
  },
  {
    src: legacyImage('saltPouch6lb'),
    alt: "Salt pouch packaging",
    category: "Products",
  },
];

export const galleryCategories = ["All", "Products", "Horses", "Cattle"];
