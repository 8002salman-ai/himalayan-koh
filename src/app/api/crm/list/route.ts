import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verifyAdminRequest';
import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';

export const dynamic = 'force-dynamic';

function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim();
    const source = (searchParams.get('source') || '').trim();
    const couponUsed = searchParams.get('couponUsed');
    const format = (searchParams.get('format') || 'json').toLowerCase();

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('crm_leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (source) {
      query = query.eq('source', source);
    }

    if (couponUsed === '1') {
      query = query.eq('coupon_used', true);
    } else if (couponUsed === '0') {
      query = query.or('coupon_used.is.null,coupon_used.eq.false');
    }

    if (search) {
      query = query.or(
        `email.ilike.%${search}%,name.ilike.%${search}%,phone.ilike.%${search}%,company.ilike.%${search}%,coupon_code.ilike.%${search}%`
      );
    }

    const { data: leads, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items = (leads || []) as Array<Record<string, unknown>>;

    if (format === 'csv') {
      const headers = ['id', 'email', 'name', 'phone', 'source', 'page_url', 'coupon_code', 'coupon_used', 'created_at'];
      const rows = items.map((l) => [
        escapeCsv(l.id),
        escapeCsv(l.email),
        escapeCsv(l.name),
        escapeCsv(l.phone),
        escapeCsv(l.source),
        escapeCsv(l.page_url),
        escapeCsv(l.coupon_code),
        escapeCsv(l.coupon_used ? 'true' : 'false'),
        escapeCsv(l.created_at),
      ]);
      const csvText = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      return new Response(csvText, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="crm-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return NextResponse.json({ ok: true, leads: items });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to list CRM leads' },
      { status: 500 }
    );
  }
}
