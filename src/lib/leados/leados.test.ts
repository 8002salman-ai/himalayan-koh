import { describe, it, expect } from 'vitest';
import { calculateOpportunityScore, DEFAULT_SCORE_WEIGHTS } from './scoring';
import { calculateDeterministicProjectFit } from './project-fit';
import { resolveOsmTags } from './osm-provider';
import { HK_DEFAULT_PROJECT } from './db';
import type { NormalizedLead } from './types';

describe('LeadOS Scoring & Project Fit Engine', () => {
  const sampleLead: NormalizedLead = {
    businessName: 'Lone Star Farm & Feed Supply',
    category: 'Feed Store',
    address: '100 County Road 42',
    city: 'Houston',
    region: 'Texas',
    country: 'United States',
    website: null,
    phone: '713-555-0199',
    email: null,
    latitude: 29.7604,
    longitude: -95.3698,
    osmType: 'node',
    osmId: '12345678',
    osmUrl: 'https://www.openstreetmap.org/node/12345678',
    dataSource: 'openstreetmap',
  };

  it('calculates deterministic opportunity score correctly based on observed signals', () => {
    const opp = calculateOpportunityScore(sampleLead);
    // Base 50 + no_website (25) + no_email (10) + has_category (10) = 95
    expect(opp.score).toBe(95);
    expect(opp.signals).toContain(DEFAULT_SCORE_WEIGHTS.no_website.name);
    expect(opp.signals).toContain(DEFAULT_SCORE_WEIGHTS.no_email.name);
  });

  it('penalizes website presence appropriately without crashing', () => {
    const leadWithSite: NormalizedLead = {
      ...sampleLead,
      website: 'https://lonestarfeed.com',
      email: 'sales@lonestarfeed.com',
    };
    const opp = calculateOpportunityScore(leadWithSite);
    // Base 50 - 10 (has_website) + 10 (has_category) = 50
    expect(opp.score).toBe(50);
  });

  it('evaluates strong project fit for Himalayan Koh B2B Salt ICP', () => {
    const fit = calculateDeterministicProjectFit(sampleLead, HK_DEFAULT_PROJECT);
    // Feed Store matches category (+40), Texas matches preferred location (+20), farm/feed matches positive keywords (+20), ICP baseline (+10) = 90
    expect(fit.score).toBeGreaterThanOrEqual(80);
    expect(fit.reasons.length).toBeGreaterThan(0);
    expect(fit.outreachAngles.length).toBeGreaterThan(0);
    expect(fit.method).toBe('deterministic');
  });

  it('applies negative keyword penalties for non-target businesses', () => {
    const irrelevantLead: NormalizedLead = {
      ...sampleLead,
      businessName: 'Express Fast Food & Gas Station',
      category: 'Fast Food',
    };
    const fit = calculateDeterministicProjectFit(irrelevantLead, HK_DEFAULT_PROJECT);
    expect(fit.score).toBeLessThan(50);
    expect(fit.reasons.some((r) => r.includes('exclusion') || r.includes('matches non-target'))).toBe(true);
  });

  it('resolves OSM tags accurately for Himalayan Koh target categories', async () => {
    const feedTags = await resolveOsmTags('Feed Store');
    expect(feedTags.tags.some((t) => t.key === 'shop' && (t.value === 'agrarian' || t.value === 'farm'))).toBe(true);

    const equineTags = await resolveOsmTags('Equestrian Store');
    expect(equineTags.tags.some((t) => t.key === 'shop' && (t.value === 'equestrian' || t.value === 'saddlery'))).toBe(true);
  });
});
