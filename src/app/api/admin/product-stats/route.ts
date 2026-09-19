/**
 * First-party product analytics for the catalogue table (Views / Interest).
 *
 * The table reads real views and interest, one aggregated request for the whole
 * page — never a per-row query. This app has **no** analytics store of its own:
 * that was Luxedge's, and it was not part of this migration. So the honest answer
 * today is that the figures are unavailable, and it is given as a `200` with the
 * reason attached rather than as a missing route.
 *
 * That distinction is the point. When this endpoint did not exist the screen
 * logged a `404` on every visit, which reads as a broken console, and a value
 * invented here would be worse: a view count the store never recorded. The screen
 * renders `—` for Views/Interest and shows the reason, and the columns start
 * carrying real numbers the day an analytics source is connected — one place to
 * change, no fake data to remove first.
 *
 * Anything that does report figures must aggregate them server-side and carry the
 * same shape: `{ stats: { [productId]: { views, views7d, views30d, interest,
 * saved } } }`.
 */

import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verifyAdminRequest';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  return NextResponse.json({
    stats: null,
    unavailable: 'No product analytics source is connected on this deployment.',
  });
}
