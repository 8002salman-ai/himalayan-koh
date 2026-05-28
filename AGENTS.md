## Cursor Cloud specific instructions

- This is a Next.js App Router storefront; use `docs/NEXTJS.md` as the source of truth for standard install/build/run commands.
- The app can run without Supabase in fallback storefront mode: product browsing, localStorage cart, and checkout form rendering work with mock data. Auth, order submission, admin data, RLS checks, and seeded demo accounts require Supabase credentials.
- Supabase scripts accept the Next.js `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` names and legacy `VITE_*` aliases. Full setup still also needs `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_DB_URL`.
- `npm run lint` currently invokes `next lint` and opens Next's interactive ESLint setup because no ESLint config is committed. Use `npm run build` or `npx tsc --noEmit` for non-interactive validation until lint config is migrated.
- `npm run verify:phase0` is stale after the Next.js migration and expects removed Vite files such as `vite.config.ts`.
