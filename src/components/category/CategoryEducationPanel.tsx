import { motion } from 'framer-motion';
import type { CategoryContentBundle } from '../../lib/categoryContent';
import { getCategoryAvailability } from '../../lib/categoryContent';
import ProductAccordionArticles from '../product/ProductAccordionArticles';
import CategoryHubGallery from './CategoryHubGallery';
import ProductPdfLibrary from '../product/ProductPdfLibrary';
import PdpEmptyState from '../product/PdpEmptyState';
import type { CategoryArticleSource } from '../../hooks/useCategoryBlogArticles';
import type { CategoryArticleCard } from '../../lib/categoryContent';
import CategoryArticleCards from './CategoryArticleCards';
import CategoryTrustStrip from './CategoryTrustStrip';

interface Props {
  content: CategoryContentBundle;
  articles?: CategoryArticleCard[];
  articlesLoading?: boolean;
  articlesSource?: CategoryArticleSource;
}

export default function CategoryEducationPanel({
  content,
  articles,
  articlesLoading,
  articlesSource,
}: Props) {
  const resolvedArticles = articles ?? content.articles;
  const availability = getCategoryAvailability({
    ...content,
    articles: resolvedArticles,
  });

  return (
    <motion.aside
      key={content.key}
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className="space-y-8 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1 pb-4"
      aria-label={`${content.hero.title} education and resources`}
    >
      <div className="rounded-2xl border border-himalayan/20 bg-gradient-to-br from-himalayan-lighter/90 via-white to-warm-white p-5 sm:p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-himalayan mb-2">
          {content.hero.eyebrow}
        </p>
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal leading-tight">
          {content.hero.title}
        </h2>
        <p className="text-sm text-charcoal-light mt-2 leading-relaxed">{content.hero.subtitle}</p>
      </div>

      <CategoryTrustStrip points={content.trustPoints} />

      <section aria-labelledby={`${content.key}-gallery-heading`}>
        <h3 id={`${content.key}-gallery-heading`} className="font-serif text-lg font-bold text-charcoal mb-3">
          Lifestyle gallery
        </h3>
        {availability.gallery ? (
          <CategoryHubGallery images={content.gallery} title={content.hero.title} />
        ) : (
          <PdpEmptyState
            title="Gallery"
            message={content.emptyStates.gallery || 'Category photos will be added soon.'}
            compact
          />
        )}
      </section>

      <CategoryArticleCards
        articles={resolvedArticles}
        emptyMessage={content.emptyStates.articles}
        loading={articlesLoading}
        source={articlesSource}
      />

      <section aria-labelledby={`${content.key}-guides-heading`}>
        <h3 id={`${content.key}-guides-heading`} className="font-serif text-lg font-bold text-charcoal mb-3">
          Guides & education
        </h3>
        {availability.guides ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm">
            <ProductAccordionArticles articles={content.guides} />
          </div>
        ) : (
          <PdpEmptyState
            title="Guides"
            message={content.emptyStates.guides || 'Guides for this category are being prepared.'}
            compact
          />
        )}
      </section>

      <section aria-labelledby={`${content.key}-resources-heading`}>
        <h3 id={`${content.key}-resources-heading`} className="font-serif text-lg font-bold text-charcoal mb-3">
          Downloads
        </h3>
        {availability.pdfs ? (
          <ProductPdfLibrary resources={content.pdfs} />
        ) : (
          <PdpEmptyState
            title="Resources"
            message={content.emptyStates.pdfs || 'PDF resources will appear here soon.'}
            compact
          />
        )}
      </section>
    </motion.aside>
  );
}
