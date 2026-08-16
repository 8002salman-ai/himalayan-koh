import { beforeEach, describe, expect, it, vi } from 'vitest';

const { checkRateLimit, upsert } = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock('@/lib/rateLimit', () => ({ checkRateLimit }));
vi.mock('@/lib/stripe/server/supabaseAdmin', () => ({
  getSupabaseAdmin: () => ({
    from: () => ({ upsert }),
  }),
}));

import { POST } from './route';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/newsletter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('POST /api/newsletter', () => {
  beforeEach(() => {
    checkRateLimit.mockReset();
    upsert.mockReset();
    checkRateLimit.mockReturnValue({ allowed: true, remaining: 4, resetAt: Date.now() + 60_000 });
    upsert.mockResolvedValue({ error: null });
  });

  it('subscribes a valid email with the default footer source', async () => {
    const res = await POST(makeRequest({ email: '  Customer@Example.com  ' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(upsert).toHaveBeenCalledWith(
      { email: 'customer@example.com', source: 'footer' },
      { onConflict: 'email', ignoreDuplicates: true }
    );
  });

  it('passes through a provided source', async () => {
    const res = await POST(makeRequest({ email: 'a@b.co', source: 'homepage' }));
    expect(res.status).toBe(200);
    expect(upsert).toHaveBeenCalledWith(
      { email: 'a@b.co', source: 'homepage' },
      { onConflict: 'email', ignoreDuplicates: true }
    );
  });

  it('rejects malformed JSON', async () => {
    const res = await POST(makeRequest('not json'));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid JSON body.' });
    expect(upsert).not.toHaveBeenCalled();
  });

  it('requires an email', async () => {
    const res = await POST(makeRequest({ email: '' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Email is required.' });
  });

  it('rejects an invalid email address', async () => {
    const res = await POST(makeRequest({ email: 'not-an-email' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Enter a valid email address.' });
  });

  it('returns 429 when the client is rate limited', async () => {
    checkRateLimit.mockReturnValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60_000 });
    const res = await POST(makeRequest({ email: 'a@b.co' }));
    expect(res.status).toBe(429);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('returns 500 when the database write fails', async () => {
    upsert.mockResolvedValue({ error: new Error('boom') });
    const res = await POST(makeRequest({ email: 'a@b.co' }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Unable to subscribe. Please try again.' });
  });
});
