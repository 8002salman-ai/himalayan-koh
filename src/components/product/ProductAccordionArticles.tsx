import { useCallback, useId, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronDown } from 'lucide-react';
import type { PdpAccordionArticle } from '../../lib/products/pdpContent';

interface Props {
  articles: PdpAccordionArticle[];
}

export default function ProductAccordionArticles({ articles }: Props) {
  const baseId = useId();
  const [openId, setOpenId] = useState<string | null>(articles[0]?.id ?? null);
  const headerRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const openIndex = articles.findIndex((a) => a.id === openId);

  const focusHeader = useCallback((index: number) => {
    const el = headerRefs.current[index];
    el?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent, index: number) => {
      const last = articles.length - 1;
      let next = index;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          next = index < last ? index + 1 : 0;
          focusHeader(next);
          break;
        case 'ArrowUp':
          event.preventDefault();
          next = index > 0 ? index - 1 : last;
          focusHeader(next);
          break;
        case 'Home':
          event.preventDefault();
          focusHeader(0);
          break;
        case 'End':
          event.preventDefault();
          focusHeader(last);
          break;
        default:
          break;
      }
    },
    [articles.length, focusHeader]
  );

  if (articles.length === 0) {
    return null;
  }

  return (
    <section
      className="mt-8 bg-white rounded-2xl shadow-md shadow-black/5 p-6 md:p-8"
      aria-label="Product guides"
    >
      <h2 className="font-serif text-xl font-bold text-charcoal mb-5">Guides &amp; information</h2>

      <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
        {articles.map((article, index) => {
          const isOpen = openId === article.id;
          const panelId = `${baseId}-panel-${article.id}`;
          const headerId = `${baseId}-header-${article.id}`;

          return (
            <div key={article.id} className="bg-white">
              <h3 className="m-0">
                <button
                  ref={(el) => {
                    headerRefs.current[index] = el;
                  }}
                  type="button"
                  id={headerId}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpenId(isOpen ? null : article.id)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className="w-full flex items-center justify-between gap-4 px-4 md:px-5 py-4 text-left font-medium text-charcoal text-sm md:text-base hover:bg-gray-50/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-himalayan/40"
                >
                  {article.title}
                  <ChevronDown
                    size={18}
                    aria-hidden
                    className={`shrink-0 text-himalayan transition-transform duration-300 motion-reduce:transition-none ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              </h3>

              <div
                id={panelId}
                role="region"
                aria-labelledby={headerId}
                aria-hidden={!isOpen}
                className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
                  isOpen ? 'border-t border-gray-100' : 'border-t border-transparent'
                }`}
                style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
              >
                <div className="overflow-hidden min-h-0">
                  <div className="px-4 md:px-5 pb-5 pt-1 text-sm text-charcoal-light leading-relaxed space-y-3">
                    <ArticleBody article={article} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {openIndex >= 0 && (
        <p className="sr-only" aria-live="polite">
          {articles[openIndex].title} section expanded
        </p>
      )}
    </section>
  );
}

function ArticleBody({ article }: { article: PdpAccordionArticle }) {
  if (article.faqs?.length) {
    return (
      <dl className="space-y-4 m-0">
        {article.faqs.map((faq) => (
          <div key={faq.question}>
            <dt className="font-semibold text-charcoal text-sm mb-1">{faq.question}</dt>
            <dd className="m-0">{faq.answer}</dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <>
      {article.paragraphs?.map((p) => (
        <p key={p} className="m-0">
          {p}
        </p>
      ))}
      {article.bullets && article.bullets.length > 0 && (
        <ul className="list-disc pl-5 space-y-1.5 m-0">
          {article.bullets.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </>
  );
}
