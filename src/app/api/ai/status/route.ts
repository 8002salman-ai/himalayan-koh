import { NextResponse } from 'next/server';
import { resolveAiSeoConfig } from '@/lib/ai/gemini';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await resolveAiSeoConfig();
    const isConfigured = !!config.apiKey;

    return NextResponse.json({
      backend: isConfigured ? 'configured' : 'missing',
      providers: [
        {
          id: config.provider,
          name: config.provider === 'openrouter' ? 'OpenRouter (Gemini 2.5 Flash)' : 'Google Gemini',
          configured: isConfigured,
          model: config.model,
        },
      ],
    });
  } catch (err) {
    return NextResponse.json({
      backend: 'missing',
      providers: [],
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
