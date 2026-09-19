import type { NormalizedLead, ProjectFitResult, LeadOSProject } from './types';

export interface AIAnalysisResult {
  summary: string;
  opportunitySignals: string[];
  potentialValue: string;
  confidence: 'low' | 'medium' | 'high';
}

export interface AIProjectFitResult {
  score: number;
  reasons: string[];
  outreachAngles: string[];
}

function getOpenRouterApiKey(): string | null {
  return process.env.OPENROUTER_API_KEY || null;
}

function getDeepSeekApiKey(): string | null {
  return process.env.DEEPSEEK_API_KEY || null;
}

/**
 * Calls OpenRouter / DeepSeek chat completions API with strict error boundaries.
 */
async function callChatCompletions(
  provider: 'openrouter' | 'deepseek',
  messages: Array<{ role: string; content: string }>,
  modelOverride?: string
): Promise<string> {
  const isDeepSeek = provider === 'deepseek';
  const apiKey = isDeepSeek ? getDeepSeekApiKey() : getOpenRouterApiKey();

  if (!apiKey) {
    throw new Error(`${isDeepSeek ? 'DeepSeek' : 'OpenRouter'} API key is not configured on the server.`);
  }

  const endpoint = isDeepSeek
    ? 'https://api.deepseek.com/v1/chat/completions'
    : 'https://openrouter.ai/api/v1/chat/completions';

  const defaultModel = isDeepSeek ? 'deepseek-chat' : (process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat');
  const model = modelOverride || defaultModel;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...(isDeepSeek ? {} : { 'HTTP-Referer': 'https://preview.himalayankoh.com', 'X-Title': 'Himalayan Koh LeadOS' }),
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      max_tokens: 800,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`AI API error ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * AI Lead Analysis: strictly factual evaluation of verified input data.
 * Will never hallucinate metrics or contact points.
 */
export async function analyzeLeadWithAI(
  lead: NormalizedLead,
  provider: 'openrouter' | 'deepseek' = 'openrouter'
): Promise<AIAnalysisResult> {
  const prompt = `You are an enterprise B2B lead intelligence assistant for Himalayan Koh.
Analyze this business lead strictly based on the verifiable facts provided.
CRITICAL: Do NOT invent, assume, or hallucinate metrics, review counts, revenue, employee numbers, or missing contact info.
Only reference data actually observed below.

Business: ${lead.businessName}
Category: ${lead.category}
Location: ${[lead.address, lead.city, lead.region, lead.country].filter(Boolean).join(', ')}
Website: ${lead.website || 'None listed'}
Phone: ${lead.phone || 'None listed'}
Email: ${lead.email || 'None listed'}

Return ONLY a valid JSON object:
{
  "summary": "Brief 1-2 sentence assessment of business type and suitability",
  "opportunitySignals": ["Signal 1", "Signal 2"],
  "potentialValue": "Estimated suitability level (e.g. High Wholesale Potential / Low / Specialized)",
  "confidence": "low" | "medium" | "high"
}`;

  try {
    const raw = await callChatCompletions(provider, [{ role: 'user', content: prompt }]);
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      summary: String(parsed.summary || 'Lead analyzed successfully.'),
      opportunitySignals: Array.isArray(parsed.opportunitySignals) ? parsed.opportunitySignals : [],
      potentialValue: String(parsed.potentialValue || 'Standard Wholesale Prospect'),
      confidence: (['low', 'medium', 'high'].includes(parsed.confidence) ? parsed.confidence : 'medium') as any,
    };
  } catch (err) {
    return {
      summary: `Basic business entity identified in ${lead.city || 'local market'}. AI deeper parsing unavailable.`,
      opportunitySignals: [lead.website ? 'Has website' : 'No website listed (direct outreach required)'],
      potentialValue: 'Standard Prospect',
      confidence: 'low',
    };
  }
}

/**
 * AI Project Fit Evaluation:
 * Always fails gracefully to null so deterministic scoring keeps running.
 */
export async function scoreProjectFitWithAI(
  lead: NormalizedLead,
  project: LeadOSProject,
  provider: 'openrouter' | 'deepseek' = 'openrouter'
): Promise<ProjectFitResult | null> {
  const prompt = `Evaluate how well this business fits the project ICP.
Only use verified facts. Do not invent details.

Lead:
Name: ${lead.businessName}
Category: ${lead.category}
Location: ${[lead.city, lead.region, lead.country].filter(Boolean).join(', ')}
Website: ${lead.website || 'None'}

Target ICP:
Project: ${project.name}
Product/Service: ${project.productService || 'Wholesale Himalayan rock salt and mineral licks'}
Target Customers: ${project.targetCustomerDescription || 'Farm, feed, and equestrian stores'}
Industries: ${(project.industries || []).join(', ')}

Return ONLY valid JSON:
{
  "score": <number between 0 and 100>,
  "reasons": ["Specific reason 1", "Specific reason 2"],
  "outreachAngles": ["Actionable angle 1", "Actionable angle 2"]
}`;

  try {
    const raw = await callChatCompletions(provider, [{ role: 'user', content: prompt }]);
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      score: Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 50))),
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons.slice(0, 4) : [],
      outreachAngles: Array.isArray(parsed.outreachAngles) ? parsed.outreachAngles.slice(0, 3) : [],
      method: 'ai',
    };
  } catch {
    // Non-fatal fallback
    return null;
  }
}
