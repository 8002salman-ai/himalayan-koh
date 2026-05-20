import type { CategoryArticleCard } from './types';

/** Plain text from HTML blog content for hub previews. */
export function stripHtmlToText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Ensure each card has enough text for show more / show less on the hub. */
export function enrichArticleBody(card: CategoryArticleCard): CategoryArticleCard {
  if (card.body?.trim()) return card;

  const excerpt = card.excerpt.trim();
  if (excerpt.length >= 220) {
    return { ...card, body: excerpt };
  }

  return {
    ...card,
    body: `${excerpt} Learn how Himalayan Koh products support real ranch and barn programs — mineral balance, free-choice placement, and practical tips from our ${card.tag} library. Read the full story on the blog for step-by-step guidance.`,
  };
}

export function enrichArticleList(cards: CategoryArticleCard[]): CategoryArticleCard[] {
  return cards.map(enrichArticleBody);
}
