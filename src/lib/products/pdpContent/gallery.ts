import { galleryImages } from '../../../data/products';
import type { Product } from '../../../data/products';
import { isLivestockPdpProduct } from './categories';
import type { PdpGalleryImage } from './types';

/** Per-slug overrides (Phase D CMS-ready shape). */
const GALLERY_BY_SLUG: Record<string, PdpGalleryImage[]> = {
  'himalayan-salt-licks-horses': [
    {
      id: 'horse-lick-1',
      src: 'https://himalayankoh.com/wp-content/uploads/2021/03/horse-lick-himalayan-salt5-600x450.jpg',
      alt: 'Horse licking a Himalayan pink salt lick in a paddock',
      width: 600,
      height: 450,
    },
    {
      id: 'horse-lick-2',
      src: 'https://himalayankoh.com/wp-content/uploads/2017/10/slat-licking-horse.jpg',
      alt: 'Horse using a natural Himalayan salt lick',
      width: 600,
      height: 450,
    },
    {
      id: 'horse-grazing',
      src: 'https://himalayankoh.com/wp-content/uploads/2019/08/horses-1300x200.jpg',
      alt: 'Horses grazing on open pasture',
      width: 1300,
      height: 200,
    },
  ],
  'himalayan-livestock-salt-45lbs': [
    {
      id: 'cattle-salt-bag',
      src: 'https://himalayankoh.com/wp-content/uploads/2020/10/1-600x450.jpeg',
      alt: '45 lb Himalayan pink salt bag for livestock',
      width: 600,
      height: 450,
    },
    {
      id: 'horse-lick-pasture',
      src: 'https://himalayankoh.com/wp-content/uploads/2021/03/horse-lick-himalayan-salt5-600x450.jpg',
      alt: 'Horse at a mineral salt lick in the field',
      width: 600,
      height: 450,
    },
    {
      id: 'livestock-grazing',
      src: 'https://himalayankoh.com/wp-content/uploads/2017/10/blog9.jpg',
      alt: 'Cattle grazing with mineral supplementation',
      width: 600,
      height: 450,
    },
  ],
  'himalayan-salt-cattle-18lbs': [
    {
      id: 'cattle-rock-18',
      src: 'https://himalayankoh.com/wp-content/uploads/2020/10/1-600x450.jpeg',
      alt: '18 lb Himalayan salt rock bag for cattle',
      width: 600,
      height: 450,
    },
    {
      id: 'cattle-pasture',
      src: 'https://himalayankoh.com/wp-content/uploads/2017/10/blog9.jpg',
      alt: 'Cattle herd on pasture',
      width: 600,
      height: 450,
    },
  ],
};

function fromSiteGallery(category: 'Horses' | 'Cattle'): PdpGalleryImage[] {
  return galleryImages
    .filter((img) => img.category === category)
    .map((img, index) => ({
      id: `site-${category.toLowerCase()}-${index}`,
      src: img.src,
      alt: img.alt,
      width: 600,
      height: 450,
      visible: true,
    }));
}

function visibleOnly(images: PdpGalleryImage[]): PdpGalleryImage[] {
  return images.filter((img) => img.visible !== false);
}

/** Returns lifestyle gallery images for the PDP right column. */
export function getPdpGalleryImages(product: Product): PdpGalleryImage[] {
  const slugImages = GALLERY_BY_SLUG[product.slug];
  if (slugImages?.length) return visibleOnly(slugImages);

  if (!isLivestockPdpProduct(product)) return [];

  if (product.category === 'Salt Lick for Horses') {
    return visibleOnly(fromSiteGallery('Horses'));
  }

  return visibleOnly([...fromSiteGallery('Cattle'), ...fromSiteGallery('Horses')].slice(0, 5));
}
