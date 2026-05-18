export const config = {
  runtime: 'edge',
};

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const stableFreeModels = [
  'deepseek/deepseek-chat-v3-0324:free',
  'qwen/qwen3-32b:free',
  'meta-llama/llama-3.3-70b-instruct:free',
];

const modelCandidates = Array.from(new Set([
  ...stableFreeModels,
  process.env.OPENROUTER_MODEL,
].filter(Boolean))) as string[];
const maxMessages = 12;
const maxMessageLength = 2000;

const systemPrompt = `You are the Himalayan Koh customer support assistant.
Help customers with product recommendations, livestock salt guidance, product comparisons, FAQs, and order/support questions.
Keep answers concise, practical, and safe. Do not provide veterinary diagnosis; recommend contacting a veterinarian for medical issues.
Relevant product categories include edible Himalayan pink cooking salt, horse salt licks, cattle salt rocks, livestock salt bags, and deer salt blocks.
When unsure about inventory, pricing, shipping, order status, or account details, tell the customer to contact support or check their account.`;

export default async function handler(request: Request): Promise<Response> {
  const responseHeaders = corsHeaders(request);

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: responseHeaders,
    });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, responseHeaders);
  }

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return jsonResponse({ error: 'Content-Type must be application/json' }, 415, responseHeaders);
  }

  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPEN_ROUTER_API_KEY;
  if (!apiKey) {
    return jsonResponse({ error: 'AI assistant is not configured yet. Please add OPENROUTER_API_KEY in Vercel.' }, 503, responseHeaders);
  }

  let body: { messages?: ChatMessage[] };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400, responseHeaders);
  }

  const messages = (body.messages || [])
    .filter((message) => ['user', 'assistant'].includes(message.role) && message.content?.trim())
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, maxMessageLength),
    }))
    .slice(-maxMessages);

  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    return jsonResponse({ error: 'A user message is required' }, 400, responseHeaders);
  }

  const upstream = await requestOpenRouter({
    apiKey,
    origin: request.headers.get('origin') || 'https://himalayankoh.com',
    messages,
  });

  if (!upstream.content) {
    return jsonResponse(
      { error: friendlyAiError(upstream.error) },
      upstream.status || 502,
      responseHeaders
    );
  }

  return new Response(upstream.content, {
    headers: {
      ...responseHeaders,
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-OpenRouter-Model': upstream.model,
    },
  });
}

async function requestOpenRouter({
  apiKey,
  origin,
  messages,
}: {
  apiKey: string;
  origin: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
}): Promise<{ content: string; model: string; status: number; error?: string }> {
  let lastError = '';
  let lastStatus = 502;

  for (const model of modelCandidates) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': origin,
        'X-Title': 'Himalayan Koh Ecommerce Assistant',
      },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        temperature: 0.35,
        max_tokens: 750,
      }),
    });

    lastStatus = response.status || 502;

    if (response.ok) {
      const parsed = await parseOpenRouterResponse(response);
      if (parsed.content) {
        console.info('OpenRouter model succeeded', { model, status: response.status });
        return { content: parsed.content, model, status: response.status };
      }

      lastError = parsed.error || `OpenRouter returned an empty response for ${model}`;
    } else {
      lastError = await readableOpenRouterError(response);
    }

    console.warn('OpenRouter model failed', {
      model,
      status: response.status,
      error: lastError,
    });

    if (isConfigurationError(response.status, lastError)) {
      return { content: '', model, status: response.status, error: lastError };
    }
  }

  return {
    content: '',
    model: modelCandidates[modelCandidates.length - 1],
    status: lastStatus,
    error: lastError || 'No OpenRouter model is available right now.',
  };
}

async function parseOpenRouterResponse(response: Response) {
  try {
    const parsed = await response.json() as {
      choices?: { message?: { content?: string } }[];
      error?: { message?: string } | string;
      message?: string;
    };

    const content = parsed.choices?.[0]?.message?.content?.trim();
    if (content) return { content };

    if (typeof parsed.error === 'string') return { error: parsed.error };
    return { error: parsed.error?.message || parsed.message || 'OpenRouter returned no message content.' };
  } catch {
    return { error: 'OpenRouter returned an invalid response.' };
  }
}

function isConfigurationError(status: number, error: string) {
  if ([401, 402, 403].includes(status)) return true;
  return /api key|auth|credit|quota|billing/i.test(error);
}

function friendlyAiError(error?: string) {
  if (!error) return 'The AI assistant is temporarily busy. Please try again in a moment.';
  if (/api key|auth/i.test(error)) return 'The AI assistant is not configured correctly yet. Please contact support.';
  if (/credit|quota|billing/i.test(error)) return 'The AI assistant is temporarily unavailable due to provider limits. Please try again later.';
  return 'The AI assistant is temporarily busy. Please try again in a moment.';
}

async function readableOpenRouterError(response: Response) {
  const fallback = `OpenRouter request failed (${response.status})`;
  try {
    const text = await response.text();
    if (!text) return fallback;
    const parsed = JSON.parse(text) as { error?: { message?: string } | string; message?: string };
    if (typeof parsed.error === 'string') return parsed.error;
    return parsed.error?.message || parsed.message || fallback;
  } catch {
    return fallback;
  }
}

function jsonResponse(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });
}

function corsHeaders(request: Request) {
  const origin = request.headers.get('origin') || 'https://himalayankoh.com';
  return {
    'Access-Control-Allow-Origin': origin,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
