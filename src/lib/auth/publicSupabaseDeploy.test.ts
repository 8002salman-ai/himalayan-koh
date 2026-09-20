import { describe, expect, it } from 'vitest';
import {
  missingPublicSupabaseKeys,
  publicSupabasePresence,
  resolvePublicSupabaseEnv,
} from '../../../scripts/lib/public-supabase-env.mjs';

describe('public Supabase deploy configuration', () => {
  it('resolves public values and mirrors them to Vinext aliases', () => {
    const config = resolvePublicSupabaseEnv({
      fileContents: [
        'NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co\nNEXT_PUBLIC_SUPABASE_ANON_KEY=public-test-key\nSUPABASE_SERVICE_ROLE_KEY=server-only-secret',
      ] as string[],
    }) as unknown as Record<string, string | undefined>;
    expect(publicSupabasePresence(config)).toEqual({ url: true, anonKey: true });
    expect(missingPublicSupabaseKeys(config)).toEqual([]);
    expect(config.VITE_SUPABASE_URL).toBe('https://example.supabase.co');
    expect(config.VITE_SUPABASE_ANON_KEY).toBe('public-test-key');
    expect(config.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
  });

  it('fails closed when either canonical public value is missing', () => {
    expect(missingPublicSupabaseKeys({ NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co' }))
      .toEqual(['NEXT_PUBLIC_SUPABASE_ANON_KEY']);
    expect(missingPublicSupabaseKeys({ NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-test-key' }))
      .toEqual(['NEXT_PUBLIC_SUPABASE_URL']);
    expect(missingPublicSupabaseKeys({ VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_ANON_KEY: 'legacy-key' }))
      .toEqual(['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']);
  });

  it('parses normally quoted public values without leaking quote characters into the build', () => {
    const config = resolvePublicSupabaseEnv({
      fileContents: [
        'NEXT_PUBLIC_SUPABASE_URL="https://example.supabase.co"\nNEXT_PUBLIC_SUPABASE_ANON_KEY=\'quoted-key\'',
      ],
    }) as unknown as Record<string, string | undefined>;
    expect(config.NEXT_PUBLIC_SUPABASE_URL).toBe('https://example.supabase.co');
    expect(config.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('quoted-key');
  });

  it('uses explicit process environment values without exposing unrelated secrets', () => {
    const config = resolvePublicSupabaseEnv({
      processEnv: {
        NEXT_PUBLIC_SUPABASE_URL: 'https://env.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'env-public-key',
        SUPABASE_SERVICE_ROLE_KEY: 'server-only-secret',
      },
    }) as unknown as Record<string, string | undefined>;
    expect(publicSupabasePresence(config)).toEqual({ url: true, anonKey: true });
    expect(Object.keys(config).sort()).toEqual([
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'NEXT_PUBLIC_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY',
      'VITE_SUPABASE_URL',
    ]);
  });
});
