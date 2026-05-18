export const config = {
  runtime: 'edge',
};

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const model = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.2-3b-instruct:free';

const systemPrompt = `You are the Himalayan Koh customer support assistant.
Help customers with product recommendations, livestock salt guidance, product comparisons, FAQs, and order/support questions.
Keep answers concise, practical, and safe. Do not provide veterinary diagnosis; recommend contacting a veterinarian for medical issues.
Relevant product categories include edible Himalayan pink cooking salt, horse salt licks, cattle salt rocks, livestock salt bags, and deer salt blocks.
When unsure about inventory, pricing, shipping, order status, or account details, tell the customer to contact support or check their account.`;

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return jsonResponse({ error: 'OpenRouter API key is not configured' }, 500);
  }

  let body: { messages?: ChatMessage[] };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const messages = (body.messages || [])
    .filter((message) => ['user', 'assistant'].includes(message.role) && message.content?.trim())
    .slice(-12);

  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    return jsonResponse({ error: 'A user message is required' }, 400);
  }

  const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': request.headers.get('origin') || 'https://himalayankoh.com',
      'X-Title': 'Himalayan Koh Ecommerce Assistant',
    },
    body: JSON.stringify({
      model,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature: 0.4,
      max_tokens: 700,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const errorText = await upstream.text();
    return jsonResponse({ error: errorText || 'OpenRouter request failed' }, upstream.status || 502);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body!.getReader();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;

            const payload = trimmed.replace(/^data:\s*/, '');
            if (payload === '[DONE]') {
              controller.close();
              return;
            }

            try {
              const parsed = JSON.parse(payload) as {
                choices?: { delta?: { content?: string } }[];
              };
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                controller.enqueue(encoder.encode(content));
              }
            } catch {
              // Ignore malformed SSE keepalive chunks.
            }
          }
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders(),
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(),
      'Content-Type': 'application/json',
    },
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
