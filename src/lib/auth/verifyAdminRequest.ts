import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';

export async function verifyAdminRequest(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false as const, status: 401, error: 'Admin authentication required.' };
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return { ok: false as const, status: 401, error: 'Admin authentication required.' };
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return { ok: false as const, status: 401, error: 'Invalid or expired session.' };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    const role = (profile as { role?: string } | null)?.role;
    if (role !== 'admin') {
      return { ok: false as const, status: 403, error: 'Admin access required.' };
    }

    return { ok: true as const, userId: userData.user.id };
  } catch (error) {
    console.error('Admin auth verification failed:', error);
    return { ok: false as const, status: 500, error: 'Unable to verify admin session.' };
  }
}
