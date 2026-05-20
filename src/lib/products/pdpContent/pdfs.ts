import type { Product } from '../../../data/products';
import { isLivestockPdpProduct } from './categories';
import type { PdpPdfResource } from './types';

const SHARED_RESOURCES: PdpPdfResource[] = [
  {
    id: 'mineral-overview',
    title: 'Trace Mineral Overview',
    description: 'Summary of naturally occurring minerals in Himalayan pink salt for livestock programs.',
    url: '/resources/trace-mineral-overview.pdf',
    fileSize: '124 KB',
    publishedAt: '2026-01-15',
    visible: true,
  },
  {
    id: 'feeding-best-practices',
    title: 'Feeding Best Practices',
    description: 'Free-choice placement, water access, and intake guidelines for horses and cattle.',
    url: '/resources/feeding-best-practices.pdf',
    fileSize: '186 KB',
    publishedAt: '2026-02-01',
    visible: true,
  },
];

const SLUG_RESOURCES: Record<string, PdpPdfResource[]> = {
  'himalayan-salt-licks-horses': [
    {
      id: 'horse-lick-guide',
      title: 'Horse Salt Lick Setup Guide',
      description: 'Mounting, holder safety, and barn placement for Himalayan salt licks.',
      url: '/resources/horse-salt-lick-guide.pdf',
      fileSize: '210 KB',
      publishedAt: '2026-03-01',
      visible: true,
    },
  ],
  'himalayan-livestock-salt-45lbs': [
    {
      id: 'bulk-feeder-guide',
      title: 'Bulk Feeder Guide (45 lb)',
      description: 'Feeder sizing, station count, and weather protection for pasture bags.',
      url: '/resources/bulk-feeder-guide.pdf',
      fileSize: '198 KB',
      publishedAt: '2026-02-20',
      visible: true,
    },
  ],
};

function formatPublishedDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function formatPdfPublishedLabel(iso: string): string {
  return formatPublishedDate(iso);
}

function visibleOnly(resources: PdpPdfResource[]): PdpPdfResource[] {
  return resources.filter((r) => r.visible !== false);
}

/** PDF downloads for livestock PDPs; empty for edible products. */
export function getPdpPdfResources(product: Product): PdpPdfResource[] {
  if (!isLivestockPdpProduct(product)) return [];

  const slugSpecific = SLUG_RESOURCES[product.slug] ?? [];
  const merged = [...slugSpecific, ...SHARED_RESOURCES];

  const seen = new Set<string>();
  return visibleOnly(
    merged.filter((resource) => {
      if (seen.has(resource.id)) return false;
      seen.add(resource.id);
      return true;
    })
  );
}
