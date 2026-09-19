import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verifyAdminRequest';
import { resolveAiSeoConfig } from '@/lib/ai/gemini';

export const dynamic = 'force-dynamic';

const OPENROUTER_API_ROOT = 'https://openrouter.ai/api/v1';
const GEMINI_API_ROOT = 'https://generativelanguage.googleapis.com/v1beta';

export async function POST(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { prompt?: string; system?: string; provider?: string; model?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const prompt = (body.prompt || '').trim();
  if (!prompt) {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
  }

  const config = await resolveAiSeoConfig();
  if (!config.apiKey) {
    return NextResponse.json(
      { error: 'No AI provider is configured. Please configure an API key in Admin Settings.' },
      { status: 503 }
    );
  }

  const system = (body.system || 'You are an honest, accurate assistant for Himalayan Koh. Return clean factual responses.').trim();
  const model = body.model || config.model;

  try {
    let text = '';
    if (config.provider === 'openrouter') {
      const res = await fetch(`${OPENROUTER_API_ROOT}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://preview.himalayankoh.com',
          'X-Title': 'Himalayan Koh Admin AI',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 1500,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        return NextResponse.json(
          { error: `AI provider error (HTTP ${res.status}): ${errText.slice(0, 200)}` },
          { status: res.status }
        );
      }

      const data = await res.json();
      text = data?.choices?.[0]?.message?.content || '';
    } else {
      // Direct Gemini
      const endpoint = `${GEMINI_API_ROOT}/models/${model}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `${system}\n\n${prompt}` }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1500 },
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        return NextResponse.json(
          { error: `Gemini error (HTTP ${res.status}): ${errText.slice(0, 200)}` },
          { status: res.status }
        );
      }

      const data = await res.json();
      text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') || '';
    }

    return NextResponse.json({
      text,
      provider: config.provider,
      model,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI generation request failed';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
