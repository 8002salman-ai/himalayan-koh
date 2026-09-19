/**
 * Authenticated customer session verification — server only.
 *
 * Checks Bearer JWT with Supabase Auth and returns the verified user.
 * Blocks unauthenticated access and extracts the customer's email securely.
 */

import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';

export interface VerifiedCustomer {
  id: string;
  email: string;
}

export type VerifyCustomerResult =
  | { ok: true; user: VerifiedCustomer }
  | { ok: false; status: number; error: string };

export async function verifyCustomerRequest(request: Request): Promise<VerifyCustomerResult> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Customer authentication required.' };
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return { ok: false, status: 401, error: 'Customer authentication required.' };
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return { ok: false, status: 401, error: 'Invalid or expired customer session.' };
    }

    const email = userData.user.email?.trim().toLowerCase();
    if (!email) {
      return { ok: false, status: 400, error: 'Account has no email address.' };
    }

    return {
      ok: true,
      user: {
        id: userData.user.id,
        email,
      },
    };
  } catch (error) {
    console.error('Customer auth verification failed:', error);
    return { ok: false, status: 500, error: 'Unable to verify customer session.' };
  }
}
