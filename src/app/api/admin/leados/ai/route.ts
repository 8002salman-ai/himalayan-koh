import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verifyAdminRequest';
import { analyzeLeadWithAI, scoreProjectFitWithAI } from '@/lib/leados/ai';
import { getProjectById } from '@/lib/leados/db';

export async function POST(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { action = 'analyze', lead, projectId, provider = 'openrouter' } = body;

    if (action === 'test') {
      const apiKey = provider === 'deepseek' ? process.env.DEEPSEEK_API_KEY : process.env.OPENROUTER_API_KEY;
      return NextResponse.json({
        ok: true,
        provider,
        configured: Boolean(apiKey),
        model: provider === 'deepseek' ? 'deepseek-chat' : (process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat'),
      });
    }

    if (!lead || !lead.businessName) {
      return NextResponse.json({ error: 'Valid lead data is required' }, { status: 400 });
    }

    const analysis = await analyzeLeadWithAI(lead, provider);

    let projectFit = null;
    if (projectId) {
      const project = await getProjectById(projectId);
      if (project) {
        projectFit = await scoreProjectFitWithAI(lead, project, provider);
      }
    }

    return NextResponse.json({
      ok: true,
      analysis,
      projectFit,
    });
  } catch (error) {
    console.error('LeadOS AI route error:', error);
    return NextResponse.json({ error: 'AI processing failed' }, { status: 500 });
  }
}
