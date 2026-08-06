import type { Product } from '../../data/products';
import { SITE_NAME } from '../seo/constants';
import { getProductContent, getProductDisplayName } from './productContent';

const BRAND_SUFFIX = ` | ${SITE_NAME}`;
const MAX_TITLE_LENGTH = 60;
const MAX_DESCRIPTION_LENGTH = 160;

function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

function normalizeTitle(title: string): string {
  const withoutBrand = title.replace(/\s*\|\s*Himalayan Koh\s*$/i, '').trim();
  const maxBaseLength = MAX_TITLE_LENGTH - BRAND_SUFFIX.length;
  // Truncate the product's own title first so the brand suffix always
  // survives intact — truncating the combined string let long product
  // titles eat into " | Himalayan Koh", leaving titles that end in a bare
  // "|…" with no brand name at all.
  const base =
    withoutBrand.length > maxBaseLength ? truncateAtWord(withoutBrand, maxBaseLength) : withoutBrand;
  return `${base}${BRAND_SUFFIX}`;
}

function buildFallbackDescription(product: Product, displayName: string): string {
  const price =
    product.priceRange && product.priceMax
      ? `From $${product.priceMin.toFixed(2)}`
      : `$${product.priceMin.toFixed(2)}`;

  const category = product.category.toLowerCase();

  if (category.includes('edible') || category.includes('cooking')) {
    return `${displayName} — unrefined Himalayan pink salt with 84+ trace minerals. ${price}. Free U.S. shipping on orders over $50.`;
  }

  if (category.includes('horse') || category.includes('cattle') || category.includes('livestock')) {
    return `${displayName} — natural mineral salt for herd health and hydration. ${price}. Ranch-ready shipping from ${SITE_NAME}.`;
  }

  return `${displayName}. Premium Himalayan pink salt — ${price}. Shop ${SITE_NAME} for natural, mineral-rich salt.`;
}

export function buildProductPageSeo(product: Product): { title: string; description: string } {
  const content = getProductContent(product);
  const displayName = content.displayName;

  let title: string;
  if (product.metaTitle) {
    title = normalizeTitle(product.metaTitle);
  } else if (content.metaTitle) {
    title = normalizeTitle(content.metaTitle);
  } else {
    title = normalizeTitle(displayName);
  }

  let description: string;
  if (product.metaDescription) {
    description = truncateAtWord(product.metaDescription.trim(), MAX_DESCRIPTION_LENGTH);
  } else if (content.metaDescription) {
    description = truncateAtWord(content.metaDescription.trim(), MAX_DESCRIPTION_LENGTH);
  } else if (product.description) {
    const lead = product.description.split(/[.!]/)[0]?.trim();
    description = truncateAtWord(
      lead ? `${displayName}. ${lead}.` : buildFallbackDescription(product, displayName),
      MAX_DESCRIPTION_LENGTH
    );
  } else {
    description = truncateAtWord(buildFallbackDescription(product, displayName), MAX_DESCRIPTION_LENGTH);
  }

  return { title, description };
}

export { getProductDisplayName };
