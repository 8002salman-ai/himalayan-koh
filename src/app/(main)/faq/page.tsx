import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';
import { faqJsonLd } from '@/lib/seo/jsonLd';
import JsonLd from '@/components/seo/JsonLd';
import FaqClient from './FaqClient';

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: 'FAQ - Himalayan Koh',
    description: 'Frequently asked questions about Himalayan Koh salt products, shipping, returns, and wholesale.',
    path: '/faq',
  });
}

const FAQ_ITEMS = faqJsonLd([
  {
    question: 'What makes Himalayan Koh salt different from regular salt?',
    answer: 'Our salt is unrefined Himalayan pink salt, naturally rich in 84+ trace minerals. Unlike processed table salt, it contains no additives, anti-caking agents, or added chemicals.',
  },
  {
    question: 'Is your salt safe for both livestock and human consumption?',
    answer: 'Yes. Our Himalayan pink salt is natural and unrefined, and is offered in both livestock salt licks/blocks and food-grade edible salt for cooking.',
  },
  {
    question: 'What is your return and replacement policy?',
    answer: 'Return requests must be made within 30 days of your order date, and eligible products are replaced (not refunded) once received and inspected.',
  },
  {
    question: 'Do you offer wholesale or bulk pricing?',
    answer: 'Yes, we offer a wholesale program for retail stores, farm & ranch suppliers, veterinary clinics, distributors, and online sellers.',
  },
]);

export default function Page() {
  return (
    <>
      <JsonLd data={FAQ_ITEMS} />
      <FaqClient />
    </>
  );
}
