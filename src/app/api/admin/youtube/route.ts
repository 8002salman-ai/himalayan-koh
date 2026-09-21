import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verifyAdminRequest';
import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/youtube — returns channel + videos for the YouTube Media page.
 * This is a convenience endpoint; the real data lives in channel and videos sub-routes.
 */
export async function GET(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = getSupabaseAdmin();

  // Fetch channel config
  const { data: channelRow } = await (supabase as any)
    .from('youtube_settings')
    .select('*')
    .eq('id', 'channel')
    .single();

  // Fetch videos
  const { data: videos } = await (supabase as any)
    .from('youtube_videos')
    .select('*')
    .order('sort_order', { ascending: true });

  return NextResponse.json({
    channel: channelRow ? {
      channelId: channelRow.channel_id || '',
      channelUrl: channelRow.channel_url || '',
      channelTitle: channelRow.channel_title || '',
      channelThumbnail: channelRow.channel_thumbnail || '',
      subscriberCount: channelRow.subscriber_count || '',
      videoCount: channelRow.video_count || '',
    } : null,
    videos: (videos || []).map((v: Record<string, unknown>) => ({
      id: v.id,
      youtubeUrl: v.youtube_url,
      videoId: v.video_id,
      title: v.title,
      description: v.description || '',
      thumbnailUrl: v.thumbnail_url || '',
      duration: v.duration || '',
      publishedAt: v.published_at || '',
      channelTitle: v.channel_title || '',
      showOnStorefront: v.show_on_storefront ?? true,
      sortOrder: v.sort_order ?? 0,
      createdAt: v.created_at || '',
    })),
  });
}
