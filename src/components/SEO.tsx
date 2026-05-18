import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const siteUrl = 'https://himalayankoh.com';
const defaultTitle = 'Himalayan Koh - Premium Himalayan Pink Salt for Livestock & Cooking';
const defaultDescription = 'Premium Himalayan Pink Salt for horses, cattle, deer, and edible cooking. All natural, mineral-rich Himalayan salt products.';

const routeMetadata: Record<string, { title: string; description: string }> = {
  '/': {
    title: defaultTitle,
    description: defaultDescription,
  },
  '/products': {
    title: 'Products - Himalayan Koh',
    description: 'Shop Himalayan pink salt products for livestock, horses, cattle, deer, and cooking.',
  },
  '/about': {
    title: 'About Himalayan Koh',
    description: 'Learn about Himalayan Koh and our premium natural Himalayan pink salt products.',
  },
  '/blog': {
    title: 'Blog - Himalayan Koh',
    description: 'Read livestock health, mineral nutrition, and Himalayan salt product guides.',
  },
  '/gallery': {
    title: 'Gallery - Himalayan Koh',
    description: 'View Himalayan Koh products and livestock salt use cases.',
  },
  '/contact': {
    title: 'Contact Himalayan Koh',
    description: 'Contact Himalayan Koh for product, wholesale, shipping, and customer support questions.',
  },
  '/checkout': {
    title: 'Checkout - Himalayan Koh',
    description: 'Secure checkout for Himalayan Koh products.',
  },
};

export default function SEO() {
  const location = useLocation();

  useEffect(() => {
    const metadata = routeMetadata[location.pathname] || {
      title: defaultTitle,
      description: defaultDescription,
    };

    document.title = metadata.title;
    setMeta('description', metadata.description);
    setMeta('og:title', metadata.title, 'property');
    setMeta('og:description', metadata.description, 'property');
    setMeta('og:type', 'website', 'property');
    setMeta('og:url', `${siteUrl}${location.pathname}`, 'property');
    setMeta('twitter:card', 'summary_large_image');
    setCanonical(`${siteUrl}${location.pathname}`);
  }, [location.pathname]);

  return null;
}

function setMeta(name: string, content: string, attribute: 'name' | 'property' = 'name') {
  let element = document.querySelector(`meta[${attribute}="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function setCanonical(href: string) {
  let element = document.querySelector('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}
