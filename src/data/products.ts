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
    image: "https://himalayankoh.com/wp-content/uploads/2025/07/6-lbs-pouche.webp",
    category: "Edible Cooking Salt",
    description: "100% Natural & Unrefined – No additives, anti-caking agents, or chemicals. Rich in Trace Minerals – Over 80 essential minerals. Kosher & Vegan Friendly. Great for cooking, bath soaks, salt lamps, and more.",
    grainSizes: ["Fine (0.5mm-1mm)", "Medium (1mm-2mm)", "Coarse (2mm-5mm)"],
    inStock: true,
  },
  {
    id: 2,
    slug: 'himalayan-pink-salt-16oz-jar',
    name: "Himalayan Edible Pink Salt – 16 oz Jar",
    price: "$9.95",
    priceMin: 9.95,
    image: "https://himalayankoh.com/wp-content/uploads/2024/08/WhatsApp-Image-2024-08-02-at-11.31.07-PM-500x500.jpeg",
    category: "Edible Cooking Salt",
    description: "Premium 16 oz jar of pure Himalayan pink salt. Perfect for everyday cooking and table use.",
    grainSizes: ["Fine", "Coarse"],
    inStock: true,
  },
  {
    id: 3,
    slug: 'himalayan-rock-salt-6lbs-pouch',
    name: "Himalayan Rock Salt Pouches in Fine and Coarse Grain Sizes – 6 lbs",
    price: "$17.95",
    priceMin: 17.95,
    image: "https://himalayankoh.com/wp-content/uploads/2023/08/S6-600x450.jpg",
    category: "Edible Cooking Salt",
    description: "6 lbs pouch of premium Himalayan rock salt available in fine and coarse grain sizes.",
    grainSizes: ["Fine", "Coarse"],
    inStock: true,
  },
  {
    id: 4,
    slug: 'himalayan-livestock-salt-45lbs',
    name: "Bag of Himalayan Pink Salt for Livestock (45 lbs.)",
    price: "$99.95",
    priceMin: 99.95,
    image: "https://himalayankoh.com/wp-content/uploads/2020/10/1-600x450.jpeg",
    category: "Salt for Cattle",
    description: "45 lb bag of premium Himalayan pink salt for livestock. Essential minerals for cattle and horses.",
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
    image: "https://himalayankoh.com/wp-content/uploads/2021/03/horse-lick-himalayan-salt5-600x450.jpg",
    category: "Salt Lick for Horses",
    description: "Natural Himalayan pink salt licks specially designed for horses. Rich in 84 trace minerals.",
    inStock: true,
  },
  {
    id: 6,
    slug: 'himalayan-salt-cattle-18lbs',
    name: "Himalayan Salt Rock for Cattle 18 Lbs Bag",
    price: "$49.95",
    priceMin: 49.95,
    image: "https://himalayankoh.com/wp-content/uploads/2020/10/1-600x450.jpeg",
    category: "Salt for Cattle",
    description: "18 lb bag of Himalayan salt rocks for cattle. Natural and unprocessed.",
    inStock: true,
  },
  {
    id: 7,
    slug: 'himalayan-6lb-trace-mineral-salt-block',
    name: 'Himalayan Salt Block — Essential Trace Minerals, 6 lb',
    price: '$40.00',
    priceMin: 40,
    image: '/images/products/himalayan-6lb-salt-lick-front.png',
    category: 'Salt Lick for Horses',
    description: 'A 6 lb Himalayan salt lick with essential trace minerals. The product label identifies it for horses, cows, goats, deer, sheep, llamas, and other livestock. Ensure animals have access to clean, fresh drinking water.',
    inStock: true,
  },
  {
    id: 8,
    slug: 'himalayan-2lb-round-rope-salt-lick',
    name: 'Himalayan Round Rope Salt Lick — Essential Trace Minerals, 2 lb',
    price: '$40.00',
    priceMin: 40,
    image: '/images/products/himalayan-round-rope-salt-lick-front.png',
    category: 'Salt Lick for Horses',
    description: 'A 2 lb round Himalayan salt lick with rope and essential trace minerals for horses and livestock. Ensure animals have access to clean, fresh drinking water.',
    inStock: true,
  },
  {
    id: 9,
    slug: 'himalayan-6lb-round-rope-salt-lick',
    name: 'Himalayan Round Rope Salt Lick — Essential Trace Minerals, 6 lb',
    price: '$40.00',
    priceMin: 40,
    image: '/images/products/himalayan-round-rope-salt-lick-front.png',
    category: 'Salt Lick for Horses',
    description: 'A 6 lb round Himalayan salt lick with rope and essential trace minerals for horses and livestock. Ensure animals have access to clean, fresh drinking water.',
    inStock: true,
  },
];

export const categories = [
  {
    name: "Salt Blocks for Deer",
    image: "https://himalayankoh.com/wp-content/uploads/2021/03/horse-lick-himalayan-salt5-600x450.jpg",
    description: "Premium salt blocks attract and nourish deer naturally.",
  },
  {
    name: "Salt Lumps for Cattle",
    image: "https://himalayankoh.com/wp-content/uploads/2023/08/S6-600x450.jpg",
    description: "Essential minerals in natural salt lumps for cattle health.",
  },
  {
    name: "Salt Lick for Horses",
    image: "https://himalayankoh.com/wp-content/uploads/2017/10/slat-licking-horse.jpg",
    description: "Natural Himalayan salt licks for equine health and vitality.",
  },
  {
    name: "Edible Cooking Salt",
    image: "https://himalayankoh.com/wp-content/uploads/2017/10/bowl-of-salt.jpg",
    description: "Premium pink salt for gourmet cooking and everyday use.",
  },
];

export const blogPosts: BlogPost[] = [
  {
    id: 1,
    title: "Why do dairy cows need trace minerals?",
    excerpt: "Discover the essential role trace minerals play in dairy cow health, milk production, and overall farm productivity. Learn how Himalayan salt can provide these vital nutrients naturally.",
    image: "https://himalayankoh.com/wp-content/uploads/2017/10/blog9.jpg",
    date: "March 15, 2026",
    category: "Livestock Health",
    author: "Dr. Sarah Mitchell",
    readTime: "5 min read",
  },
  {
    id: 2,
    title: "Himalayan Pink Vs. White Salt – Why Farmers Are Switching",
    excerpt: "Learn why more ranchers and farmers are choosing Himalayan pink salt over traditional white salt for their livestock. The benefits go beyond just minerals.",
    image: "https://himalayankoh.com/wp-content/uploads/2017/10/bowl-of-salt.jpg",
    date: "February 28, 2026",
    category: "Industry Insights",
    author: "James Anderson",
    readTime: "7 min read",
  },
  {
    id: 3,
    title: "How to Choose the Right Salt Lick for Your Horses",
    excerpt: "A comprehensive guide to selecting the perfect salt lick for your equine companions. Size, placement, and mineral content all matter for horse health.",
    image: "https://himalayankoh.com/wp-content/uploads/2021/03/horse-lick-himalayan-salt5-600x450.jpg",
    date: "February 10, 2026",
    category: "Horse Care",
    author: "Emily Roberts",
    readTime: "6 min read",
  },
  {
    id: 4,
    title: "The Science Behind 84 Trace Minerals",
    excerpt: "Dive deep into the science of Himalayan pink salt and understand why these 84 trace minerals are so beneficial for livestock health and productivity.",
    image: "https://himalayankoh.com/wp-content/uploads/2023/08/S6-600x450.jpg",
    date: "January 22, 2026",
    category: "Research",
    author: "Dr. Michael Chen",
    readTime: "8 min read",
  },
  {
    id: 5,
    title: "Bulk Buying Guide for Ranch Owners",
    excerpt: "Everything you need to know about purchasing Himalayan salt in bulk for your ranch. Storage tips, quantity guidelines, and cost savings explained.",
    image: "https://himalayankoh.com/wp-content/uploads/2020/10/1-600x450.jpeg",
    date: "January 8, 2026",
    category: "Guides",
    author: "Tom Williams",
    readTime: "4 min read",
  },
  {
    id: 6,
    title: "Winter Nutrition Tips for Cattle",
    excerpt: "Keep your cattle healthy through the winter months with proper salt and mineral supplementation. Expert tips from experienced ranchers.",
    image: "https://himalayankoh.com/wp-content/uploads/2017/10/slat-licking-horse.jpg",
    date: "December 15, 2025",
    category: "Seasonal Care",
    author: "Robert Davis",
    readTime: "5 min read",
  },
];

export const galleryImages: GalleryImage[] = [
  {
    src: "https://himalayankoh.com/wp-content/uploads/2021/03/horse-lick-himalayan-salt5-600x450.jpg",
    alt: "Horse licking Himalayan salt",
    category: "Horses",
  },
  {
    src: "https://himalayankoh.com/wp-content/uploads/2023/08/S6-600x450.jpg",
    alt: "Himalayan salt products",
    category: "Products",
  },
  {
    src: "https://himalayankoh.com/wp-content/uploads/2017/10/bowl-of-salt.jpg",
    alt: "Bowl of Himalayan salt",
    category: "Products",
  },
  {
    src: "https://himalayankoh.com/wp-content/uploads/2020/10/1-600x450.jpeg",
    alt: "Himalayan salt bags",
    category: "Products",
  },
  {
    src: "https://himalayankoh.com/wp-content/uploads/2017/10/slat-licking-horse.jpg",
    alt: "Horse with salt lick",
    category: "Horses",
  },
  {
    src: "https://himalayankoh.com/wp-content/uploads/2017/10/blog9.jpg",
    alt: "Livestock grazing",
    category: "Cattle",
  },
  {
    src: "https://himalayankoh.com/wp-content/uploads/2024/08/WhatsApp-Image-2024-08-02-at-11.31.07-PM-500x500.jpeg",
    alt: "Pink salt jar",
    category: "Products",
  },
  {
    src: "https://himalayankoh.com/wp-content/uploads/2025/07/6-lbs-pouche.webp",
    alt: "Salt pouch packaging",
    category: "Products",
  },
];

export const galleryCategories = ["All", "Products", "Horses", "Cattle"];
