export type LeadOSTab = 'overview' | 'find' | 'library' | 'projects' | 'research' | 'scoring' | 'outreach' | 'ai' | 'settings';

const tabs = new Set<LeadOSTab>(['overview', 'find', 'library', 'projects', 'research', 'scoring', 'outreach', 'ai', 'settings']);

export function parseLeadOSUrlState(input: string | URL): { tab: LeadOSTab; search: string; status: string } {
  const url = typeof input === 'string' ? new URL(input, 'https://preview.himalayankoh.com') : input;
  const rawTab = url.searchParams.get('tab');
  return {
    tab: rawTab && tabs.has(rawTab as LeadOSTab) ? rawTab as LeadOSTab : 'overview',
    search: url.searchParams.get('search') || '',
    status: url.searchParams.get('status') || 'all',
  };
}
