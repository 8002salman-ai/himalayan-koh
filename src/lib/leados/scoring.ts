import type { NormalizedLead, OpportunityScoreResult } from './types';

export const DEFAULT_SCORE_WEIGHTS: Record<string, { weight: number; name: string }> = {
  no_website: { weight: 25, name: 'No Website Listed (High outreach opportunity)' },
  no_phone: { weight: 15, name: 'No Phone Listed' },
  no_email: { weight: 10, name: 'No Email Listed' },
  incomplete_address: { weight: 5, name: 'Incomplete Address' },
  has_category: { weight: 10, name: 'Categorized Business Entity' },
  has_website: { weight: -10, name: 'Established Website (Active web presence)' },
};

/**
 * Calculates deterministic opportunity score (0 to 100).
 * Clearly grounded in observed facts — never fabricates metrics.
 */
export function calculateOpportunityScore(
  lead: NormalizedLead,
  customWeights?: Record<string, { weight: number; name: string }>
): OpportunityScoreResult {
  const weightMap = customWeights || DEFAULT_SCORE_WEIGHTS;

  let score = 50; // base baseline score
  const signals: string[] = [];

  if (!lead.website) {
    const w = weightMap['no_website'];
    if (w) {
      score += w.weight;
      signals.push(w.name);
    }
  } else {
    const w = weightMap['has_website'];
    if (w) {
      score += w.weight;
      signals.push(w.name);
    }
  }

  if (!lead.phone) {
    const w = weightMap['no_phone'];
    if (w) {
      score += w.weight;
      signals.push(w.name);
    }
  }

  if (!lead.email) {
    const w = weightMap['no_email'];
    if (w) {
      score += w.weight;
      signals.push(w.name);
    }
  }

  if (!lead.address || lead.address.trim() === '') {
    const w = weightMap['incomplete_address'];
    if (w) {
      score += w.weight;
      signals.push(w.name);
    }
  }

  if (lead.category) {
    const w = weightMap['has_category'];
    if (w) {
      score += w.weight;
      signals.push(w.name);
    }
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    signals,
  };
}
