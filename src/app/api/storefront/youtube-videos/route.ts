import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';

export const dynamic = 'force-dynamic';

// GET — public endpoint: returns only videos marked visible on storefront
export async function GET() {
  const supabase = getSupabaseAdmin();

  const { data: channel } = await (supabase as any)
    .from('youtube_settings')
    .select('channel_url')
    .eq('id', 'channel')
    .single();

  const { data: videos } = await (supabase as any)
    .from('youtube_videos')
    .select('*')
    .eq('show_on_storefront', true)
    .order('sort_order', { ascending: true });

  return NextResponse.json({
    channelUrl: channel?.channel_url || '',
    videos: (videos || []).map((v: Record<string, unknown>) => ({
      id: v.id,
      youtubeUrl: v.youtube_url,
      videoId: v.video_id,
      title: v.title,
      description: v.description || '',
      thumbnailUrl: v.thumbnail_url || '',
      channelTitle: v.channel_title || '',
    })),
  });
}
