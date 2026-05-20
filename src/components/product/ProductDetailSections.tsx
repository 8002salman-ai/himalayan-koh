import { useState } from 'react';
import { ChevronDown, Gem, HelpCircle, Shield, Truck, UtensilsCrossed } from 'lucide-react';
import type { Product } from '../../data/products';
import { getProductContent } from '../../lib/products/productContent';

interface Props {
  product: Product;
  /** When true, FAQs are shown in ProductAccordionArticles instead. */
  hideFaqSection?: boolean;
}

export default function ProductDetailSections({ product, hideFaqSection = false }: Props) {
  const content = getProductContent(product);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="mt-10 space-y-8">
      <section className="bg-white rounded-2xl shadow-md shadow-black/5 p-6 md:p-8">
        <div className="flex items-center gap-2 mb-4">
          <Gem size={20} className="text-himalayan" />
          <h2 className="font-serif text-xl font-bold text-charcoal">Mineral highlights</h2>
        </div>
        <ul className="grid sm:grid-cols-2 gap-3">
          {content.mineralHighlights.map((item) => (
            <li
              key={item}
              className="text-sm text-charcoal-light leading-relaxed pl-4 border-l-2 border-himalayan/30"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-white rounded-2xl shadow-md shadow-black/5 p-6 md:p-8">
        <div className="flex items-center gap-2 mb-4">
          <UtensilsCrossed size={20} className="text-himalayan" />
          <h2 className="font-serif text-xl font-bold text-charcoal">Use cases</h2>
        </div>
        <ul className="space-y-2">
          {content.useCases.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-charcoal-light">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-himalayan shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <div className="grid md:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl shadow-md shadow-black/5 p-6 md:p-8">
          <div className="flex items-center gap-2 mb-4">
            <Truck size={20} className="text-himalayan" />
            <h2 className="font-serif text-xl font-bold text-charcoal">Shipping</h2>
          </div>
          <ul className="space-y-3">
            {content.shippingInfo.map((item) => (
              <li key={item} className="text-sm text-charcoal-light leading-relaxed">
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-white rounded-2xl shadow-md shadow-black/5 p-6 md:p-8">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={20} className="text-himalayan" />
            <h2 className="font-serif text-xl font-bold text-charcoal">Why Himalayan Koh</h2>
          </div>
          <ul className="space-y-4">
            {content.trustIndicators.map((item) => (
              <li key={item.label}>
                <p className="font-semibold text-charcoal text-sm">{item.label}</p>
                <p className="text-sm text-charcoal-light mt-0.5">{item.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {!hideFaqSection && content.faqs.length > 0 && (
        <section className="bg-white rounded-2xl shadow-md shadow-black/5 p-6 md:p-8">
          <div className="flex items-center gap-2 mb-5">
            <HelpCircle size={20} className="text-himalayan" />
            <h2 className="font-serif text-xl font-bold text-charcoal">Frequently asked questions</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {content.faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={faq.question}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full flex items-center justify-between gap-4 py-4 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="font-medium text-charcoal text-sm md:text-base pr-2">
                      {faq.question}
                    </span>
                    <ChevronDown
                      size={18}
                      className={`shrink-0 text-himalayan transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {isOpen && (
                    <p className="pb-4 text-sm text-charcoal-light leading-relaxed -mt-1">
                      {faq.answer}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
