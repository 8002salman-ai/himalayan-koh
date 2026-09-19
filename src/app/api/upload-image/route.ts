import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verifyAdminRequest';
import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

export async function POST(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { productId?: string; filename?: string; contentType?: string; base64?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { base64, contentType = 'image/jpeg', filename = 'image.jpg', productId = 'product' } = body;
  if (!base64 || typeof base64 !== 'string') {
    return NextResponse.json({ error: 'Base64 image data is required' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(contentType.toLowerCase())) {
    return NextResponse.json({ error: `Unsupported image type (${contentType}). Use JPG, PNG, WebP, GIF, or AVIF.` }, { status: 400 });
  }

  // Strip data URL prefix if present
  const base64Data = base64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  if (buffer.length > MAX_BYTES) {
    return NextResponse.json({ error: 'Image file size exceeds the 5 MB limit.' }, { status: 400 });
  }

  const ext = (filename.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const folder = (productId || 'product').replace(/[^a-zA-Z0-9_-]/g, '') || 'product';
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;

  try {
    const supabase = getSupabaseAdmin();
    // Try bucket 'products'
    let bucketName = 'products';
    let { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(path, buffer, { contentType, upsert: false, cacheControl: '3600' });

    if (uploadError && /bucket.*not found/i.test(uploadError.message)) {
      bucketName = 'product-media';
      const fallback = await supabase.storage
        .from(bucketName)
        .upload(path, buffer, { contentType, upsert: false, cacheControl: '3600' });
      uploadError = fallback.error;
    }

    if (uploadError) {
      return NextResponse.json({ error: `Storage upload failed: ${uploadError.message}` }, { status: 502 });
    }

    const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(path);
    return NextResponse.json({ publicUrl, path, size: buffer.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Storage upload service error' },
      { status: 500 }
    );
  }
}
