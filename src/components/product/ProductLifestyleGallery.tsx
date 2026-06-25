import type { PdpGalleryImage } from '../../lib/products/pdpContent';

interface Props {
  images: PdpGalleryImage[];
  productName: string;
}

const THUMB_WIDTH = 200;
const THUMB_HEIGHT = 150;

export default function ProductLifestyleGallery({ images, productName }: Props) {
  if (images.length === 0) return null;

  return (
    <aside
      className="w-full lg:w-auto lg:min-w-0"
      aria-label={`${productName} lifestyle gallery`}
    >
      <h2 className="font-serif text-lg font-bold text-charcoal mb-3 sr-only lg:not-sr-only">
        In the field
      </h2>
      <ul
        className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth [-webkit-overflow-scrolling:touch] lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:max-h-[min(520px,70vh)] lg:pb-0 lg:snap-none"
        role="list"
      >
        {images.map((image) => (
          <li
            key={image.id}
            role="listitem"
            className="snap-start shrink-0 w-[200px] lg:w-full"
          >
            <figure className="m-0">
              <div
                className="rounded-lg overflow-hidden bg-gray-100"
                style={{ aspectRatio: `${THUMB_WIDTH} / ${THUMB_HEIGHT}` }}
              >
                <img
                  src={image.src}
                  alt={image.alt}
                  width={image.width ?? THUMB_WIDTH}
                  height={image.height ?? THUMB_HEIGHT}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/images/placeholder-livestock.svg'; }}
                />
              </div>
            </figure>
          </li>
        ))}
      </ul>
    </aside>
  );
}
