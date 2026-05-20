import type { PdpGalleryImage } from '../../lib/products/pdpContent';

interface Props {
  images: PdpGalleryImage[];
  title: string;
}

/** Wide right-column gallery for category hubs (larger than PDP sidebar strip). */
export default function CategoryHubGallery({ images, title }: Props) {
  if (images.length === 0) return null;

  return (
    <div aria-label={`${title} lifestyle gallery`}>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {images.map((image, index) => (
          <figure
            key={image.id}
            className={`m-0 overflow-hidden rounded-xl bg-gray-100 shadow-sm ${
              index === 0 ? 'col-span-2 aspect-[21/9]' : 'aspect-[4/3]'
            }`}
          >
            <img
              src={image.src}
              alt={image.alt}
              width={image.width ?? 600}
              height={image.height ?? 450}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-500"
            />
          </figure>
        ))}
      </div>
    </div>
  );
}
