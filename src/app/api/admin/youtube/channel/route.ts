import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verifyAdminRequest';
import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';

export const dynamic = 'force-dynamic';

// YouTube Data API v3 — fetch channel metadata
async function fetchChannelInfo(channelUrl: string, apiKey?: string): Promise<{
  channelId: string;
  channelUrl: string;
  channelTitle: string;
  channelThumbnail: string;
  subscriberCount: string;
  videoCount: string;
}> {
  // Try to extract channel handle or ID from URL
  const handleMatch = channelUrl.match(/youtube\.com\/@([a-zA-Z0-9_.-]+)/);
  const channelMatch = channelUrl.match(/youtube\.com\/channel\/([a-zA-Z0-9_-]+)/);

  if (apiKey) {
    // Use YouTube Data API if key is provided
    let channelId = channelMatch?.[1] || '';

    if (!channelId && handleMatch) {
      // Resolve handle to channel ID
      const searchRes = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${handleMatch[1]}&key=${apiKey}`
      );
      const searchData = await searchRes.json();
      if (searchData.items?.length > 0) {
        channelId = searchData.items[0].id.channelId;
      }
    }

    if (channelId) {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`
      );
      const data = await res.json();
      if (data.items?.length > 0) {
        const ch = data.items[0];
        return {
          channelId: ch.id,
          channelUrl: `https://youtube.com/channel/${ch.id}`,
          channelTitle: ch.snippet.title,
          channelThumbnail: ch.snippet.thumbnails?.high?.url || ch.snippet.thumbnails?.default?.url || '',
          subscriberCount: ch.statistics?.subscriberCount || '0',
          videoCount: ch.statistics?.videoCount || '0',
        };
      }
    }
  }

  // Fallback: extract what we can from the URL without API
  const handle = handleMatch?.[1] || channelMatch?.[1] || 'unknown';
  return {
    channelId: handle,
    channelUrl: channelUrl.trim(),
    channelTitle: handle,
    channelThumbnail: '',
    subscriberCount: '',
    videoCount: '',
  };
}

// GET — fetch current channel config
export async function GET(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = getSupabaseAdmin();
  const { data } = await (supabase as any)
    .from('youtube_settings')
    .select('*')
    .eq('id', 'channel')
    .single();

  // Never expose the API key to the client
  return NextResponse.json({
    channel: data ? {
      channelId: data.channel_id || '',
      channelUrl: data.channel_url || '',
      channelTitle: data.channel_title || '',
      channelThumbnail: data.channel_thumbnail || '',
      subscriberCount: data.subscriber_count || '',
      videoCount: data.video_count || '',
    } : null,
    apiKey: data?.api_key ? '••••••' : '',
  });
}

// POST — connect a channel
export async function POST(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { channelUrl?: string; apiKey?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.channelUrl?.trim()) {
    return NextResponse.json({ error: 'Channel URL is required' }, { status: 400 });
  }

  const channelInfo = await fetchChannelInfo(body.channelUrl.trim(), body.apiKey?.trim());

  const supabase = getSupabaseAdmin();
  const { error } = await (supabase as any)
    .from('youtube_settings')
    .upsert({
      id: 'channel',
      channel_id: channelInfo.channelId,
      channel_url: channelInfo.channelUrl,
      channel_title: channelInfo.channelTitle,
      channel_thumbnail: channelInfo.channelThumbnail,
      subscriber_count: channelInfo.subscriberCount,
      video_count: channelInfo.videoCount,
      api_key: body.apiKey?.trim() || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

  if (error) {
    return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ channel: channelInfo });
}

// DELETE — disconnect channel
export async function DELETE(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await (supabase as any)
    .from('youtube_settings')
    .delete()
    .eq('id', 'channel');

  if (error) {
    return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
