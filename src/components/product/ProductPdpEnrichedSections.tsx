import type { PdpContentBundle } from '../../lib/products/pdpContent';
import ProductAccordionArticles from './ProductAccordionArticles';
import ProductPdfLibrary from './ProductPdfLibrary';
import PdpEmptyState from './PdpEmptyState';

interface Props {
  content: PdpContentBundle;
}

/** Accordion + PDF blocks below the product hero (from getPdpContent). */
export default function ProductPdpEnrichedSections({ content }: Props) {
  if (!content.availability.enriched) return null;

  const { availability, emptyStates } = content;

  return (
    <>
      {availability.accordion ? (
        <ProductAccordionArticles articles={content.accordionArticles} />
      ) : (
        emptyStates.accordion && (
          <PdpEmptyState title="Guides & information" message={emptyStates.accordion} />
        )
      )}

      {availability.pdfs ? (
        <ProductPdfLibrary resources={content.pdfResources} />
      ) : (
        emptyStates.pdfs && <PdpEmptyState title="Resources" message={emptyStates.pdfs} />
      )}
    </>
  );
}

export function pdpHidesDetailFaqs(content: PdpContentBundle): boolean {
  return content.availability.accordion && content.accordionArticles.some((a) => a.id === 'faqs');
}
