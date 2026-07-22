export const SITE_URL = 'https://embanillc.example.com';
export const SITE_NAME = 'Embani LLC Accounting System';
export const DEFAULT_TITLE =
  'Embani LLC Accounting System - Invoicing, Expenses & Financial Dashboards';
export const DEFAULT_DESCRIPTION =
  'A modern accounting workspace for Embani LLC with invoicing, expense tracking, cash-flow visibility, and month-end reporting.';
export const DEFAULT_OG_IMAGE = '/logo.svg';

export const ORGANIZATION_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  logo: '/logo.svg',
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+1-832-224-6466',
    contactType: 'customer service',
    areaServed: 'US',
  },
};
