import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import JsonLd from './JsonLd';
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  ORGANIZATION_JSON_LD,
  SITE_URL,
} from '../lib/seo/constants';
import { getPageSeo, subscribePageSeo } from '../lib/seo/pageSeo';

const routeMetadata: Record<string, { title: string; description: string }> = {
  '/': {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
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
  '/terms': {
    title: 'Terms of Service - Himalayan Koh',
    description: 'Terms of service for Himalayan Koh online store and product purchases.',
  },
  '/privacy': {
    title: 'Privacy Policy - Himalayan Koh',
    description: 'Privacy policy for Himalayan Koh website, accounts, and customer data.',
  },
  '/wishlist': {
    title: 'Wishlist - Himalayan Koh',
    description: 'Your saved Himalayan Koh products.',
  },
  '/account': {
    title: 'My Account - Himalayan Koh',
    description: 'Manage your Himalayan Koh account, orders, and profile.',
  },
  '/orders': {
    title: 'My Orders - Himalayan Koh',
    description: 'View your Himalayan Koh order history.',
  },
};

function resolveStaticMetadata(pathname: string) {
  if (routeMetadata[pathname]) return routeMetadata[pathname];

  if (pathname.startsWith('/blog/')) {
    return {
      title: 'Blog - Himalayan Koh',
      description: DEFAULT_DESCRIPTION,
    };
  }

  if (pathname.startsWith('/products/')) {
    return {
      title: 'Product - Himalayan Koh',
      description: DEFAULT_DESCRIPTION,
    };
  }

  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  };
}

export default function SEO() {
  const location = useLocation();
  const [, setRevision] = useState(0);

  useEffect(() => subscribePageSeo(() => setRevision((n) => n + 1)), []);

  useEffect(() => {
    const override = getPageSeo();
    const staticMeta = resolveStaticMetadata(location.pathname);
    const metadata = override ?? staticMeta;
    const canonicalPath = override?.canonicalPath ?? location.pathname;
    const canonical = `${SITE_URL}${canonicalPath}`;

    document.title = metadata.title;
    setMeta('description', metadata.description);
    setMeta('og:title', metadata.title, 'property');
    setMeta('og:description', metadata.description, 'property');
    setMeta('og:type', override?.ogType || 'website', 'property');
    setMeta('og:url', canonical, 'property');
    if (override?.ogImage) {
      setMeta('og:image', override.ogImage, 'property');
    }
    setMeta('twitter:card', 'summary_large_image');
    setCanonical(canonical);

    if (override?.noindex) {
      setMeta('robots', 'noindex, nofollow');
    } else {
      removeMeta('robots');
    }
  }, [location.pathname, location.search]);

  return location.pathname === '/' ? <JsonLd id="organization" data={ORGANIZATION_JSON_LD} /> : null;
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

function removeMeta(name: string) {
  document.querySelector(`meta[name="${name}"]`)?.remove();
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
