# Keys kahan hain? (simple)

## Live website — already OK

**https://himalayan-koh.vercel.app** uses keys stored in:

**Vercel → Project `himalayan-koh` → Settings → Environment Variables → Production**

Those values are **encrypted**. Even with CLI login, Vercel does **not** let anyone download them to `.env.local` (security). That is normal.

## Local laptop (`npm run dev`)

Uses file: **`.env.local`** in project root (same folder as `package.json`).

You must **paste** keys once from each dashboard into that file. Nobody can auto-copy locked Vercel secrets.

### Where to copy from

| Key in `.env.local` | Open this |
|---------------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → publishable / anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → service_role (secret) |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys → Secret (test) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe → Publishable (test) |
| `SHIPPO_API_KEY` | Shippo → Settings → API |

Supabase project ref: `timpjroyxoafhkwpxkiu`

## After pasting keys

```bash
npm run dev:clean
npm run check:stripe
npm run check:shippo
```

## Not in Supabase

Stripe and Shippo keys **never** live inside Supabase. Only Supabase’s own 3 keys come from Supabase.
