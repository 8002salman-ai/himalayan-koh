import { beforeEach, describe, expect, it, vi } from 'vitest';

const { checkRateLimit, getUser, deleteUser, signInWithPassword, createClient } = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  getUser: vi.fn(),
  deleteUser: vi.fn(),
  signInWithPassword: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock('@/lib/rateLimit', () => ({ checkRateLimit }));
vi.mock('@/lib/stripe/server/supabaseAdmin', () => ({
  getSupabaseAdmin: () => ({
    auth: {
      getUser,
      admin: { deleteUser },
    },
  }),
}));
vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => {
    createClient(...args);
    return { auth: { signInWithPassword } };
  },
}));

import { POST } from './route';

const USER_ID = 'user-123';
const EMAIL = 'customer@example.com';

function makeRequest(
  body: unknown,
  opts: { bearer?: string } = {}
): Request {
  const headers: Record<string, string> = {};
  if (opts.bearer !== undefined) headers['Authorization'] = `Bearer ${opts.bearer}`;
  return new Request('http://localhost/api/account/delete', {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('POST /api/account/delete', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    checkRateLimit.mockReset().mockReturnValue({
      allowed: true,
      remaining: 4,
      resetAt: Date.now() + 60_000,
    });
    getUser.mockReset().mockResolvedValue({
      data: { user: { id: USER_ID, email: EMAIL } },
      error: null,
    });
    deleteUser.mockReset().mockResolvedValue({ error: null });
    signInWithPassword.mockReset().mockResolvedValue({ error: null });
    createClient.mockReset();
  });

  it('requires a bearer token', async () => {
    const res = await POST(makeRequest({ email: EMAIL, password: 'pw' }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });

  it('rejects an empty bearer token', async () => {
    const res = await POST(makeRequest({ email: EMAIL, password: 'pw' }, { bearer: '' }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });

  it('rejects an invalid or expired session', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: new Error('bad token') });
    const res = await POST(makeRequest({ email: EMAIL, password: 'pw' }, { bearer: 'bad' }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Invalid or expired session.' });
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON', async () => {
    const res = await POST(makeRequest('nope', { bearer: 'good' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid JSON body.' });
  });

  it('requires both email and password', async () => {
    const res = await POST(makeRequest({}, { bearer: 'good' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Email and password are required.' });
  });

  it('rejects when the email does not match the authenticated account', async () => {
    const res = await POST(makeRequest({ email: 'other@example.com', password: 'pw' }, { bearer: 'good' }));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Email does not match this account.' });
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('rejects an incorrect current password', async () => {
    signInWithPassword.mockResolvedValue({ error: new Error('wrong password') });
    const res = await POST(makeRequest({ email: EMAIL, password: 'wrong' }, { bearer: 'good' }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Current password is incorrect.' });
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('deletes the user once the current password verifies', async () => {
    const res = await POST(makeRequest({ email: EMAIL, password: 'correct' }, { bearer: 'good' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(deleteUser).toHaveBeenCalledWith(USER_ID);
  });
});
