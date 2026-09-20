import { useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import type { Product } from '../../data/products';
import { loadPublishedMedia } from '../../services/media';
import type { MediaVideo } from '../../services/media';

// Re-export the YouTube embed from MediaHub — click-to-load, youtube-nocookie.com
import { YouTubeEmbed } from '../../media/MediaHub';

interface Props {
  product: Product;
}

/**
 * Product Video Section
 *
 * Displays YouTube videos from the Media Hub that are linked to this product
 * via `related_product_ids`. Uses the same click-to-load YouTubeEmbed
 * (youtube-nocookie.com, no autoplay, responsive 16:9) already used on /media.
 *
 * If no videos are linked, the section is hidden entirely — no broken state.
 */
export default function ProductVideoSection({ product }: Props) {
  const [videos, setVideos] = useState<MediaVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadVideos = async () => {
      try {
        const all = await loadPublishedMedia();
        if (cancelled || !all) return;

        // Match videos whose relatedProductIds includes this product's id
        const productId = String(product.id);
        const matched = all.filter(
          (v) =>
            v.relatedProductIds.some((pid) => String(pid) === productId) &&
            v.youtubeVideoId,
        );

        setVideos(matched);
      } catch {
        // Fail silently — section just won't render
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadVideos();
    return () => { cancelled = true; };
  }, [product.id]);

  // Don't render anything when loading, empty, or no linked videos
  if (loading || videos.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="bg-white rounded-2xl shadow-md shadow-black/5 p-6 md:p-8">
        <div className="flex items-center gap-2 mb-5">
          <Play size={20} className="text-himalayan" />
          <h2 className="font-serif text-xl font-bold text-charcoal">
            {videos.length === 1 ? 'Product Video' : 'Product Videos'}
          </h2>
        </div>

        <div className="space-y-6">
          {videos.map((video) => (
            <div key={video.id}>
              {videos.length > 1 && (
                <h3 className="text-sm font-medium text-charcoal mb-2">
                  {video.title}
                </h3>
              )}
              <YouTubeEmbed
                videoId={video.youtubeVideoId!}
                title={video.title}
              />
              {video.summary && (
                <p className="mt-2 text-sm text-charcoal-light">
                  {video.summary}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
