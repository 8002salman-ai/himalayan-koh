import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  fileURLToPath(new URL('./AuthContext.tsx', import.meta.url)),
  'utf8',
);

describe('AuthContext hydration boundary', () => {
  it('does not read browser session storage during the initial render', () => {
    expect(source).not.toMatch(/useState<.*>\(\(\)\s*=>[\s\S]*readStoredSession/);
    expect(source).toContain('const [user, setUser] = useState<User | null>(null);');
    expect(source).toContain('const [session, setSession] = useState<Session | null>(null);');
    expect(source).toContain('const [loading, setLoading] = useState(true);');
  });

  it('initializes the real Supabase session from an effect', () => {
    expect(source).toContain('supabase.auth.getSession()');
    expect(source).toContain('applySession(data.session, true);');
  });
});
