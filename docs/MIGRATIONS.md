# Database migrations — architecture & workflow

This project uses a **custom, hand-rolled migration runner**, not the Supabase CLI's native migration workflow. This is intentional. Read this before touching anything under `supabase/migrations/` or reaching for the `supabase` CLI.

## Source of truth: `public._hk_migrations`

Every migration is a plain numbered SQL file in `supabase/migrations/` (`001_initial_schema.sql` … `028_packing_profiles_for_remaining_products.sql`). They are applied **directly over a Postgres connection** (`SUPABASE_DB_URL`) by `scripts/lib/pg.mjs`, in the exact order listed in its `MIGRATIONS` array, from:

- `npm run setup` / `npm run setup:supabase` (`scripts/setup-supabase-backend.mjs`)
- `npm run reset` (`scripts/reset-demo-data.mjs`, via the same setup path)

Each applied file is recorded by filename in a project-owned tracking table, `public._hk_migrations` (created by migration `009_hk_migrations_rls.sql`, locked down with RLS so `anon`/`authenticated` can never read or write it — only `service_role`/direct DB scripts touch it). `npm run doctor` and `npm run info` read this table to report pending migrations and schema version.

**`public._hk_migrations` is the authoritative record of what has been applied to this database.** If it says a migration is applied, it is applied — this has been verified against the live schema (table/RLS/extension checks in `doctor` are independent of this table and agree with it).

### Why a custom runner instead of the Supabase CLI

- It only needs `SUPABASE_DB_URL` (a plain Postgres connection string) — no `supabase link`, no CLI project auth, no local Supabase container.
- It's fully idempotent by construction (`CREATE TABLE IF NOT EXISTS`, guarded `ALTER`/`CREATE POLICY` statements) so `npm run setup`/`reset` can be re-run any number of times safely — that idempotency guarantee is load-bearing for the whole dev-onboarding workflow described in the root `README.md`.
- It keeps the plain `NNN_description.sql` naming convention this repo has used since migration `001`, rather than the Supabase CLI's required `<14-digit-timestamp>_name.sql` format.
- It's what every dev script (`doctor`, `setup`, `reset`, `verify`, `info`) is built against. Changing the mechanism now would mean rewriting all of them.

## Do NOT run these against this project

```
supabase db push
supabase migration up
supabase migration repair
```

These are **not part of the normal workflow for this repository** and must not be run against the linked project (`timpjroyxoafhkwpxkiu`), for a concrete, verified reason:

During a short window in the project's history (commits around 2026-05-28/29, the Shippo + guest-checkout work), the Supabase CLI *was* used directly for a handful of migrations. That created 4 stale entries in the CLI's own tracking table, `supabase_migrations.schema_migrations`, under CLI-generated timestamp versions (e.g. `20260528230749` / `shippo_shipping`). Those files were subsequently renamed to fit this repo's `NNN_name.sql` convention before being committed — the CLI tracker was never updated to match, and no `supabase migration new`/`db push` has touched this table since. As a result:

- `supabase_migrations.schema_migrations` only knows about 4 migrations, under names that don't match any file currently in `supabase/migrations/`.
- It has **no knowledge whatsoever** of migrations `001`–`007` or `012`–`018` — those only ever went through the custom runner above.

If `supabase db push` or `supabase migration up` is run now, the CLI will compare its stale 4-row history against the 18 numbered files on disk, fail to match almost all of them, and attempt to re-apply migrations that are already live — which will error on non-idempotent CLI-side assumptions, or leave the CLI's tracking table in a more confused state than it already is. `supabase migration repair` does not fix this either: it edits `supabase_migrations.schema_migrations`, a table this project doesn't read from or rely on, so "repairing" it does nothing for schema correctness and risks a further mismatch if done with an incomplete version→file mapping.

**None of this affects the actual database schema** — that has been independently verified as fully correct and up to date (`npm run doctor` passes: 18/18 migrations, 15/15 required tables, RLS enabled on all of them, required extensions present). This is purely a divergence between an *unused* CLI bookkeeping table and reality; it doesn't need fixing to keep working, it just needs to be left alone.

If a genuinely CLI-native workflow is ever wanted for this project, that requires a deliberate, separately-scoped migration to rename local files into CLI-compatible timestamped form and reconcile `supabase_migrations.schema_migrations` with `public._hk_migrations` — not something to do incidentally while adding a new migration or debugging something else.

## Correct workflow for adding a new migration

1. Create the next file: `supabase/migrations/019_your_change.sql` (numbered, sequential, matches existing style — RLS/grants included where relevant, same as `002`/`009`/`017`).
2. Add the filename to the `MIGRATIONS` array in `scripts/lib/pg.mjs`, in order.
3. Write the SQL to be idempotent (`IF NOT EXISTS`, `DO $$ ... $$` guards for policies, etc.) — every migration in this repo is re-runnable by design.
4. Run `npm run setup` (or `npm run doctor` first, then `setup`) locally against a dev/staging Supabase project to confirm it applies cleanly and `_hk_migrations` records it.
5. Commit the migration file alongside any code that depends on it, in the same PR.

Never use `supabase migration new` to scaffold the file — it will prepend a CLI timestamp prefix that doesn't match this repo's convention and re-opens exactly the divergence described above.
