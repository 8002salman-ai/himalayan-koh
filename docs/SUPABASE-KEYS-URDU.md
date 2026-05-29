# Supabase keys — kahan hain? (2026 dashboard)

Supabase ne purani screen badal di. **"service_role"** ab aksar **"Secret key"** ke naam se dikhti hai.

## Direct link (apna project)

https://supabase.com/dashboard/project/timpjroyxoafhkwpxkiu/settings/api-keys

---

## Step-by-step (jo screen tum ne bheji — Project Home)

Tum ab **Project Home** par ho (`himalayan-koh`, URL `timpjroyxoafhkwpxkiu.supabase.co`).

### API keys ke 2 raste

**A) Sab se aasaan — Connect button**

1. Upar **Connect** dabao (home page par hi)
2. **App Frameworks** ya **API** section
3. Wahan **Project URL**, **Publishable**, aur kabhi **Secret** dikhti hai

**B) Settings se**

1. Left sidebar **neeche** → **Project Settings** (gear icon)
2. Menu mein → **API Keys**
3. Direct link: https://supabase.com/dashboard/project/timpjroyxoafhkwpxkiu/settings/api-keys

(Purana menu: **Settings → API** — andar **API Keys** tab.)

### 3) Do tabs dekho

| Tab | Kya milega |
|-----|------------|
| **API Keys** (naya) | `sb_publishable_...` aur `sb_secret_...` |
| **Legacy API Keys** | `anon` (lamba JWT) aur `service_role` (lamba JWT) |

Dono mein se **ek pair** use karo — mix mat karo.

---

## Tumhari `.env.local` mein kya paste karna hai

### Option A — Naye keys (recommended)

| Dashboard par dikhe | `.env.local` variable |
|---------------------|------------------------|
| **Project URL** (Settings → API ya Connect) | `NEXT_PUBLIC_SUPABASE_URL` |
| **Publishable key** `sb_publishable_...` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **Secret key** `sb_secret_...` | `SUPABASE_SERVICE_ROLE_KEY` |

### Option B — Legacy keys

| Dashboard (Legacy tab) | `.env.local` variable |
|------------------------|------------------------|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| **anon** `eyJ...` (bahut lamba) | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **service_role** `eyJ...` (bahut lamba) | `SUPABASE_SERVICE_ROLE_KEY` |

---

## Secret key "nazar nahi aa rahi" — yeh karo

1. **API Keys** tab par ho (Legacy nahi), ya Legacy par **service_role** khojo.
2. **Secret key** ke saath **eye icon / Reveal** dabao — by default hidden hoti hai.
3. Agar koi secret key hi nahi hai:
   - **Create new API key** ya **Generate secret key** button dabao
   - Phir **Reveal** karke copy karo
4. **Publishable** alag hai — woh client ke liye; **Secret** server ke liye (`SUPABASE_SERVICE_ROLE_KEY`).

---

## Galat jagah mat dhoondo

| Yeh nahi hai | Yeh hai |
|--------------|---------|
| Database password | API Secret key |
| JWT Signing Keys (alag page) | API Keys → Secret |
| Account settings | **Project** Settings → API Keys |

---

## Copy ke baad

```powershell
npm run dev:clean
npm run check:stripe
```

`check:stripe` Supabase keys bhi check karta hai.
