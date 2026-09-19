import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verifyAdminRequest';
import { getLeadOSOverviewStats, listProjects, ensureDefaultProject } from '@/lib/leados/db';

export async function GET(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    await ensureDefaultProject();
    const stats = await getLeadOSOverviewStats();
    const projects = await listProjects();

    return NextResponse.json({
      ok: true,
      stats: {
        ...stats,
        projectsCount: projects.length,
      },
    });
  } catch (error) {
    console.error('LeadOS stats error:', error);
    return NextResponse.json({ error: 'Failed to load LeadOS statistics' }, { status: 500 });
  }
}
