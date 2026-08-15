import {
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  DEFAULT_TITLE,
  SITE_URL,
} from './constants';
import type { PageSeo } from './pageSeo';

export interface ResolvedDocumentSeo {
  title: string;
  description: string;
  canonical: string;
  ogType: string;
  ogImage?: string;
  noindex?: boolean;
}

export function resolveDocumentSeo(
  pathname: string,
  override: PageSeo | null,
  staticMeta: { title: string; description: string }
): ResolvedDocumentSeo {
  const metadata = override ?? staticMeta;
  const canonicalPath = override?.canonicalPath ?? pathname;
  const canonical = `${SITE_URL}${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}`;

  return {
    title: metadata.title,
    description: metadata.description,
    canonical,
    ogType: override?.ogType || 'website',
    ogImage: override?.ogImage,
    noindex: override?.noindex,
  };
}

export function applyDocumentSeo(resolved: ResolvedDocumentSeo) {
  document.title = resolved.title;

  setMeta('description', resolved.description);
  setMeta('og:title', resolved.title, 'property');
  setMeta('og:description', resolved.description, 'property');
  setMeta('og:type', resolved.ogType, 'property');
  setMeta('og:url', resolved.canonical, 'property');

  const ogImage = resolved.ogImage || DEFAULT_OG_IMAGE;
  setMeta('og:image', ogImage, 'property');

  setMeta('twitter:card', 'summary_large_image');
  setMeta('twitter:title', resolved.title);
  setMeta('twitter:description', resolved.description);
  setMeta('twitter:image', ogImage);

  setCanonical(resolved.canonical);

  if (resolved.noindex) {
    setMeta('robots', 'noindex, nofollow');
  } else {
    removeMeta('robots');
  }
}

export function staticRouteMetadata(pathname: string): { title: string; description: string } {
  const routeMetadata: Record<string, { title: string; description: string }> = {
    '/': { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION },
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
      description: 'Contact Himalayan Koh for product, shipping, and customer support questions.',
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
    '/orders': {
      title: 'My Orders - Himalayan Koh',
      description: 'View your Himalayan Koh order history.',
    },
    '/account': {
      title: 'My Account - Himalayan Koh',
      description: 'Manage your Himalayan Koh account, orders, and profile.',
    },
  };

  if (routeMetadata[pathname]) return routeMetadata[pathname];

  if (pathname.startsWith('/blog/')) {
    return { title: 'Blog - Himalayan Koh', description: DEFAULT_DESCRIPTION };
  }

  if (pathname.startsWith('/products/')) {
    return { title: 'Product - Himalayan Koh', description: DEFAULT_DESCRIPTION };
  }

  return { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION };
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
  const links = document.querySelectorAll('link[rel="canonical"]');
  if (links.length === 0) {
    const element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    element.setAttribute('href', href);
    document.head.appendChild(element);
    return;
  }

  links.forEach((link, index) => {
    if (index === 0) {
      link.setAttribute('href', href);
    } else {
      link.remove();
    }
  });
}
