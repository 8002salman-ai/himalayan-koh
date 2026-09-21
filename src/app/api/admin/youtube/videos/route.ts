import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verifyAdminRequest';
import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';

export const dynamic = 'force-dynamic';

// YouTube oEmbed — fetch video metadata without API key
async function fetchVideoInfo(videoId: string): Promise<{
  title: string;
  description: string;
  thumbnailUrl: string;
  channelTitle: string;
  publishedAt: string;
  duration: string;
}> {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    if (!res.ok) throw new Error('oembed failed');
    const data = await res.json();
    return {
      title: data.title || `YouTube Video ${videoId}`,
      description: '',
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      channelTitle: data.author_name || '',
      publishedAt: '',
      duration: '',
    };
  } catch {
    return {
      title: `YouTube Video ${videoId}`,
      description: '',
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      channelTitle: '',
      publishedAt: '',
      duration: '',
    };
  }
}

// GET — list all videos
export async function GET(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = getSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('youtube_videos')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({
    videos: (data || []).map((v: Record<string, unknown>) => ({
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

// POST — add a video
export async function POST(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { videoId?: string; youtubeUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.videoId?.trim()) {
    return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
  }

  const videoId = body.videoId.trim();

  // Check for duplicates
  const supabase = getSupabaseAdmin();
  const { data: existing } = await (supabase as any)
    .from('youtube_videos')
    .select('id')
    .eq('video_id', videoId)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'This video is already in your library' }, { status: 409 });
  }

  // Fetch metadata from YouTube oEmbed
  const info = await fetchVideoInfo(videoId);

  // Get next sort order
  const { data: maxSort } = await (supabase as any)
    .from('youtube_videos')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const nextSort = (maxSort?.sort_order ?? -1) + 1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('youtube_videos')
    .insert({
      video_id: videoId,
      youtube_url: body.youtubeUrl || `https://www.youtube.com/watch?v=${videoId}`,
      title: info.title,
      description: info.description,
      thumbnail_url: info.thumbnailUrl,
      duration: info.duration,
      published_at: info.publishedAt || new Date().toISOString(),
      channel_title: info.channelTitle,
      show_on_storefront: true,
      sort_order: nextSort,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({
    video: {
      id: data.id,
      youtubeUrl: data.youtube_url,
      videoId: data.video_id,
      title: data.title,
      description: data.description || '',
      thumbnailUrl: data.thumbnail_url || '',
      duration: data.duration || '',
      publishedAt: data.published_at || '',
      channelTitle: data.channel_title || '',
      showOnStorefront: data.show_on_storefront ?? true,
      sortOrder: data.sort_order ?? 0,
      createdAt: data.created_at || '',
    },
  });
}
