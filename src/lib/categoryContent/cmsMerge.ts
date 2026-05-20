import type { CategoryHubOverrideRow } from './cmsTypes';
import type { CategoryContentBundle, CategoryHero, CategorySeo, CategoryTrustPoint } from './types';

function asHero(value: unknown, fallback: CategoryHero): CategoryHero {
  if (!value || typeof value !== 'object') return fallback;
  const hero = value as Partial<CategoryHero>;
  return {
    eyebrow: hero.eyebrow?.trim() || fallback.eyebrow,
    title: hero.title?.trim() || fallback.title,
    subtitle: hero.subtitle?.trim() || fallback.subtitle,
  };
}

function asSeo(value: unknown, fallback: CategorySeo): CategorySeo {
  if (!value || typeof value !== 'object') return fallback;
  const seo = value as Partial<CategorySeo>;
  return {
    title: seo.title?.trim() || fallback.title,
    description: seo.description?.trim() || fallback.description,
  };
}

function asTrustPoints(value: unknown, fallback: CategoryTrustPoint[]): CategoryTrustPoint[] {
  if (!Array.isArray(value) || value.length === 0) return fallback;
  return value
    .filter((point): point is CategoryTrustPoint => {
      return Boolean(
        point
        && typeof point === 'object'
        && typeof (point as CategoryTrustPoint).label === 'string'
        && typeof (point as CategoryTrustPoint).detail === 'string'
      );
    })
    .map((point) => ({
      label: point.label.trim(),
      detail: point.detail.trim(),
    }))
    .filter((point) => point.label && point.detail);
}

/** Apply Supabase CMS row on top of static registry defaults. */
export function applyCategoryHubOverride(
  base: CategoryContentBundle,
  row: CategoryHubOverrideRow | null
): CategoryContentBundle {
  if (!row?.is_published) return base;

  const hero = asHero(row.hero, base.hero);
  const seo = asSeo(row.seo, base.seo);
  const trustPoints = asTrustPoints(row.trust_points, base.trustPoints);

  const hasHeroOverride = Boolean(
    (row.hero as Partial<CategoryHero>)?.eyebrow
    || (row.hero as Partial<CategoryHero>)?.title
    || (row.hero as Partial<CategoryHero>)?.subtitle
  );
  const hasSeoOverride = Boolean(
    (row.seo as Partial<CategorySeo>)?.title
    || (row.seo as Partial<CategorySeo>)?.description
  );
  const hasTrustOverride = Array.isArray(row.trust_points) && (row.trust_points as unknown[]).length > 0;

  if (!hasHeroOverride && !hasSeoOverride && !hasTrustOverride) {
    return base;
  }

  return {
    ...base,
    hero,
    seo,
    trustPoints,
  };
}
