import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  fileURLToPath(new URL('./client.ts', import.meta.url)),
  'utf8',
);

describe('Supabase SDK client configuration', () => {
  it('uses the same resolver as the working browser auth client', () => {
    expect(source).toContain("import { getSupabaseConfig } from '@/services/supabase';");
    expect(source).toContain('const supabaseConfig = getSupabaseConfig();');
    expect(source).toContain('const hasSupabaseConfig = supabaseConfig !== null;');
  });

  it('does not use the browser-unsafe process.env-only config path', () => {
    expect(source).not.toContain("import { publicEnv } from '@/lib/env';");
    expect(source).not.toContain('Boolean(supabaseUrl && supabaseAnonKey)');
  });
});
