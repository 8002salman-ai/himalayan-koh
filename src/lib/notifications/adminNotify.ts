import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';
import type { Json } from '@/lib/supabase/database.types';

export async function notifyAdmins(
  title: string,
  message: string,
  data?: Record<string, unknown>
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: admins, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin');

  if (error) {
    console.error('Failed to load admin profiles for notifications:', error);
    return;
  }

  if (!admins?.length) return;

  const rows = admins.map((admin) => ({
    user_id: (admin as { id: string }).id,
    type: 'order' as const,
    title,
    message,
    data: (data || null) as Json,
  }));

  const { error: insertError } = await supabase.from('notifications').insert(rows as never);
  if (insertError) {
    console.error('Failed to insert admin notifications:', insertError);
  }
}
