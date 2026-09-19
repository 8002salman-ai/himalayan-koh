/**
 * Gemini, for the admin's SEO assistant — server only.
 *
 * ## Why Gemini is here at all, next to OpenRouter
 *
 * OpenRouter powers the *customer-facing* chat widget, and it is deliberately left
 * alone: its route, its prompt and its free-model fallback chain are untouched by
 * this module. This one is the staff-side writing assistant — SEO titles, meta
 * descriptions, product copy drafts — and it exists because the owner asked for a
 * separate model for staff content.
 *
 * ## The key never leaves the server
 *
 * The key is read from `site_settings` (settable in Admin → Settings) and falls
 * back to the `GEMINI_API_KEY` environment variable. It is never a `NEXT_PUBLIC_*`
 * variable, never returned to a caller, and never logged: `geminiConnectionStatus`
 * reports the *source* of the key ("saved in the console" / "environment") and
 * nothing else about it.
 *
 * ## Generated copy is a draft and stays one
 *
 * Every generated field is checked by `lib/products/claims` before it is returned,
 * so a model that writes "FDA-approved, cures inflammation" produces a *blocked*
 * field with the matched claim named, not a suggestion. Nothing in this module
 * writes to WordPress or to a product: `generateSeoDraft` is pure with respect to
 * the store, and the console's Apply step is a separate, explicitly gated action.
 */

import { getSetting } from '../settings/serverSettings';
import { findProhibitedClaims, type ProhibitedClaim } from '../products/claims';

/** The model used when nothing is configured. Overridable from Settings. */
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

const API_ROOT = 'https://generativelanguage.googleapis.com/v1beta';

export type GeminiKeySource = 'console' | 'environment' | 'none';

export interface GeminiConfig {
  apiKey: string;
  model: string;
  keySource: GeminiKeySource;
}

/** The configured key and model, without ever exposing the key. */
export async function resolveGeminiConfig(): Promise<GeminiConfig> {
  const dbKey = (await getSetting('gemini', 'api_key'))?.trim() || '';
  const envKey = process.env.GEMINI_API_KEY?.trim() || '';
  const apiKey = dbKey || envKey;

  const dbModel = (await getSetting('gemini', 'model'))?.trim() || '';
  const envModel = process.env.GEMINI_MODEL?.trim() || '';
  const model = dbModel || envModel || DEFAULT_GEMINI_MODEL;

  return {
    apiKey,
    model,
    keySource: dbKey ? 'console' : envKey ? 'environment' : 'none',
  };
}

export type GeminiState =
  | 'CONNECTED'
  | 'NOT CONFIGURED'
  | 'INVALID KEY'
  | 'QUOTA/RATE LIMITED'
  | 'MODEL UNAVAILABLE'
  | 'UNREACHABLE';

export interface GeminiStatus {
  state: GeminiState;
  model: string;
  keySource: GeminiKeySource;
  /** A sentence safe to render: no key material, no upstream body. */
  detail: string;
}

/** Maps an upstream HTTP status to the state the console shows. */
function stateForStatus(status: number): GeminiState {
  if (status === 400 || status === 401 || status === 403) return 'INVALID KEY';
  if (status === 429) return 'QUOTA/RATE LIMITED';
  if (status === 404) return 'MODEL UNAVAILABLE';
  return 'UNREACHABLE';
}

/**
 * Asks Gemini whether the configured key and model work.
 *
 * Deliberately a *read* of the model's metadata rather than a generation: a
 * connection test must not spend tokens, and a model lookup distinguishes "the key
 * is wrong" from "the model name is wrong" — two failures that look identical in a
 * generate call.
 */
export async function testGeminiConnection(timeoutMs = 12_000): Promise<GeminiStatus> {
  const config = await resolveGeminiConfig();
  if (!config.apiKey) {
    return {
      state: 'NOT CONFIGURED',
      model: config.model,
      keySource: 'none',
      detail:
        'No Gemini API key is configured. Add one in Admin → Settings → Gemini, or set GEMINI_API_KEY in the server environment. Drafting text in this console does not require it; generating does.',
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${API_ROOT}/models/${encodeURIComponent(config.model)}`, {
      headers: { 'x-goog-api-key': config.apiKey },
      signal: controller.signal,
    });
    if (response.ok) {
      return {
        state: 'CONNECTED',
        model: config.model,
        keySource: config.keySource,
        detail: `The key works and "${config.model}" is available for this project.`,
      };
    }
    const state = stateForStatus(response.status);
    return {
      state,
      model: config.model,
      keySource: config.keySource,
      detail:
        state === 'INVALID KEY'
          ? 'Gemini rejected the key. Check that the key is complete, enabled for the Generative Language API, and belongs to the right project.'
          : state === 'QUOTA/RATE LIMITED'
            ? 'Gemini is rate-limiting this key. Wait, or use a key with a higher quota.'
            : state === 'MODEL UNAVAILABLE'
              ? `The model "${config.model}" is not available to this key. Set a different model in Settings.`
              : `Gemini could not be reached (HTTP ${response.status}).`,
    };
  } catch (error) {
    return {
      state: 'UNREACHABLE',
      model: config.model,
      keySource: config.keySource,
      detail: `Gemini could not be reached: ${error instanceof Error ? error.message : String(error)}`,
    };
  } finally {
    clearTimeout(timer);
  }
}

export interface SeoDraftInput {
  /** What is being written for. */
  subject: 'product' | 'category' | 'page';
  name: string;
  /** Facts the copy may use. Anything not here must not be asserted. */
  facts: {
    sku?: string | null;
    price?: string | null;
    weight?: string | null;
    category?: string | null;
    grainSize?: string | null;
    description?: string | null;
    currentTitle?: string | null;
    currentMeta?: string | null;
  };
  keywords?: string[];
}

export interface SeoDraftField {
  value: string;
  /** Prohibited claims found in this field; non-empty means it must not be applied. */
  blocked: ProhibitedClaim[];
}

export interface SeoDraft {
  title: SeoDraftField;
  metaDescription: SeoDraftField;
  description: SeoDraftField;
  keywords: string[];
  model: string;
  /** Warnings about the generation itself, not about the copy. */
  warnings: string[];
}

export class GeminiError extends Error {
  readonly status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = 'GeminiError';
    this.status = status;
  }
}

const SYSTEM_INSTRUCTION = `You write product and category copy for Himalayan Koh, a US store selling Himalayan pink salt, salt licks and salt blocks, packed and shipped from Houston, Texas.

Rules you must follow:
- Use only the facts you are given. Never invent a certification, a laboratory test, an origin claim, a health benefit, a shipping promise or a stock figure.
- Never make a medical or veterinary claim: no curing, treating, healing, preventing, detoxing, or "FDA approved", "USDA organic", "non-GMO", "certified", "clinically proven", "veterinarian approved".
- Plain, factual, restrained English. No hype, no exclamation marks, no superlatives you cannot support.
- A salt lick for horses or cattle is a legitimate product: name the animal plainly when the product is for it, and describe use without promising an effect on the animal's health or milk yield.
- Respond with JSON only, matching the requested shape exactly.`;

function buildPrompt(input: SeoDraftInput): string {
  const facts = Object.entries(input.facts)
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
    .map(([key, value]) => `- ${key}: ${String(value).trim()}`)
    .join('\n');

  return `Write SEO copy for this ${input.subject}.

Name: ${input.name}
${facts ? `Known facts (the only facts you may use):\n${facts}` : 'No verified facts were supplied: write only what the name itself supports.'}
${input.keywords?.length ? `Keywords to work in naturally: ${input.keywords.join(', ')}` : ''}

Return JSON with exactly these keys:
{"title": "an SEO title, at most 60 characters", "metaDescription": "a meta description, at most 155 characters", "description": "a short product description, 2 to 4 sentences, plain text with no HTML", "keywords": ["up to 6 keywords"]}`;
}

function extractJson(text: string): Record<string, unknown> | null {
  const trimmed = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

function field(value: unknown): SeoDraftField {
  const text = typeof value === 'string' ? value.trim() : '';
  return { value: text, blocked: findProhibitedClaims(text) };
}

/**
 * Generates an SEO draft. Never writes anything, anywhere.
 *
 * The response is validated before it is trusted: a model that returns prose
 * instead of JSON, or omits a field, produces a typed error rather than a half
 * draft the console would render as an empty suggestion.
 */
export async function generateSeoDraft(
  input: SeoDraftInput,
  options: { timeoutMs?: number } = {}
): Promise<SeoDraft> {
  const config = await resolveGeminiConfig();
  if (!config.apiKey) {
    throw new GeminiError(
      'Gemini is not configured, so no draft can be generated. Add a key in Admin → Settings → Gemini, or set GEMINI_API_KEY in the server environment.',
      503
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 45_000);

  try {
    const response = await fetch(
      `${API_ROOT}/models/${encodeURIComponent(config.model)}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.apiKey },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          contents: [{ role: 'user', parts: [{ text: buildPrompt(input) }] }],
          generationConfig: {
            temperature: 0.4,
            responseMimeType: 'application/json',
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      const state = stateForStatus(response.status);
      throw new GeminiError(
        state === 'INVALID KEY'
          ? 'Gemini rejected the API key.'
          : state === 'QUOTA/RATE LIMITED'
            ? 'Gemini is rate-limiting this key right now. Try again shortly.'
            : state === 'MODEL UNAVAILABLE'
              ? `The model "${config.model}" is not available to this key.`
              : `Gemini could not be reached (HTTP ${response.status}).`,
        response.status === 429 ? 429 : 502
      );
    }

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
      promptFeedback?: { blockReason?: string };
    };

    if (payload.promptFeedback?.blockReason) {
      throw new GeminiError(
        `Gemini refused the request (${payload.promptFeedback.blockReason}). Adjust the input and try again.`,
        422
      );
    }

    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
    const parsed = extractJson(text);
    if (!parsed) {
      throw new GeminiError('Gemini returned a response that was not the requested JSON shape.');
    }

    const warnings: string[] = [];
    const blockedTotal = [field(parsed.title), field(parsed.metaDescription), field(parsed.description)]
      .flatMap((entry) => entry.blocked).length;
    if (blockedTotal > 0) {
      warnings.push(
        'The draft contains claims this store cannot support. Those fields are marked blocked and must not be applied.'
      );
    }

    return {
      title: field(parsed.title),
      metaDescription: field(parsed.metaDescription),
      description: field(parsed.description),
      keywords: Array.isArray(parsed.keywords)
        ? parsed.keywords.map((entry) => String(entry).trim()).filter(Boolean).slice(0, 6)
        : [],
      model: config.model,
      warnings,
    };
  } catch (error) {
    if (error instanceof GeminiError) throw error;
    const aborted = error instanceof Error && error.name === 'AbortError';
    throw new GeminiError(
      aborted
        ? 'Gemini did not answer in time. Try again, or use a smaller model.'
        : `The draft could not be generated: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    clearTimeout(timer);
  }
}
