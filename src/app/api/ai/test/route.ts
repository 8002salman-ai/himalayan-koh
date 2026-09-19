import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verifyAdminRequest';
import { testAiSeoConnection } from '@/lib/ai/gemini';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const status = await testAiSeoConnection();
    const ok = status.state === 'CONNECTED';
    return NextResponse.json({
      ok,
      message: ok ? `Connected successfully to ${status.provider} (${status.model})` : status.detail,
      status,
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      message: err instanceof Error ? err.message : 'Connection test failed',
    });
  }
}
