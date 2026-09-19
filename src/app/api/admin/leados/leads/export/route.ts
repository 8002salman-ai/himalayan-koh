import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verifyAdminRequest';
import { listSavedLeads } from '@/lib/leados/db';

export async function GET(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { leads } = await listSavedLeads({ limit: 1000 });

    const headers = [
      'Business Name',
      'Category',
      'Address',
      'City',
      'Region',
      'Country',
      'Website',
      'Phone',
      'Email',
      'Opportunity Score',
      'Status',
      'Discovered At',
    ];

    const rows = leads.map((l) => [
      `"${(l.businessName || '').replace(/"/g, '""')}"`,
      `"${(l.category || '').replace(/"/g, '""')}"`,
      `"${(l.address || '').replace(/"/g, '""')}"`,
      `"${(l.city || '').replace(/"/g, '""')}"`,
      `"${(l.region || '').replace(/"/g, '""')}"`,
      `"${(l.country || '').replace(/"/g, '""')}"`,
      `"${(l.website || '').replace(/"/g, '""')}"`,
      `"${(l.phone || '').replace(/"/g, '""')}"`,
      `"${(l.email || '').replace(/"/g, '""')}"`,
      l.opportunityScore ?? '',
      `"${(l.status || 'new').replace(/"/g, '""')}"`,
      `"${l.discoveredAt || l.createdAt}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="leados-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error('LeadOS export CSV error:', error);
    return NextResponse.json({ error: 'Failed to export leads' }, { status: 500 });
  }
}
