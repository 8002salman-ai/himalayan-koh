/**
 * The store's customers, for the console's Customers screen.
 *
 * This is the commerce-side list: name, contact, how many orders the store counts
 * against them and what they add up to. Sign-in identity and roles are a different
 * thing and stay on Users — the console used to answer this screen from the
 * authentication table, which could not tell a shopper from a signup.
 *
 * Nothing here mutates a customer: the credential in use is not scoped for
 * customer writes, and the console says so rather than offering a button the store
 * would refuse.
 */

import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verifyAdminRequest';
import {
  WooCustomerError,
  listWooCustomers,
  summariseCustomer,
} from '@/lib/woo/customers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const params = new URL(request.url).searchParams;

  try {
    const page = await listWooCustomers({
      search: params.get('search') || undefined,
      page: Number(params.get('page') ?? '1') || 1,
      perPage: Number(params.get('limit') ?? '') || undefined,
      payingOnly: params.get('payingOnly') === '1',
    });

    return NextResponse.json({
      customers: page.customers.map(summariseCustomer),
      count: page.total,
      totalPages: page.totalPages,
      page: page.page,
    });
  } catch (error) {
    const status = error instanceof WooCustomerError ? error.status : 502;
    const message = error instanceof Error ? error.message : 'The customers could not be read.';
    return NextResponse.json({ error: message }, { status });
  }
}
