# Community Platform

The **Veryresto Identity Portal** — the centralized authentication and identity management hub for the Veryresto resident ecosystem.

**Live:** [community.veryresto.com](https://community.veryresto.com)  
**GitHub:** [veryresto/community-platform](https://github.com/veryresto/community-platform)

---

## What This Is

This is the **single sign-on portal** for all Veryresto resident applications. It is the only app in the ecosystem that handles Google OAuth and manages resident identity. Other resident apps (IPL Finder, Rekap Viewer, etc.) redirect here to authenticate and share the session via a cross-subdomain cookie.

### Key Responsibilities

- **Google OAuth sign-in** — the only OAuth entry point in the ecosystem
- **Resident approval workflow** — new accounts go through admin review before access is granted
- **Role & permission management** — admins assign app-level roles to residents via the Admin Center
- **Session propagation** — sets the `veryresto-auth` cookie on `.veryresto.com` so all subdomains share the same session

### Ecosystem Apps

| App | URL | Status |
|---|---|---|
| Community Platform (this) | `community.veryresto.com` | ✅ Live |
| IPL Finder | `ipl-finder.veryresto.com` | ✅ Live |
| Rekap Viewer | `rekap.veryresto.com` | ✅ Live |
| Kas Management | — | 📋 Planned |
| Surat Administration | — | 📋 Planned |

---

## For Resident Developers

If you are building a new app that should authenticate using this portal, read the integration docs:

| Document | Description |
|---|---|
| [Auth Integration Guide](./docs/auth-integration-guide.md) | Start here — overview, app registration, quick reference |
| [Veryresto Identity Protocol](./docs/veryresto-identity-protocol.md) | Platform-agnostic auth contract (cookie, redirect, approval, RBAC specs) |
| [React + Vite Implementation](./docs/auth/react-vite.md) | Reference implementation for React/Vite apps |
| [Node.js + Express Implementation](./docs/auth/node-express.md) | Reference implementation for Express backends |
| [Next.js Implementation](./docs/auth/nextjs.md) | Stub — contributions welcome |
| [Laravel Implementation](./docs/auth/laravel.md) | Stub — contributions welcome |
| [Go + Fiber Implementation](./docs/auth/go-fiber.md) | Stub — contributions welcome |

---

## Tech Stack

- **Framework:** React 19 + Vite
- **Language:** TypeScript
- **Auth & Database:** Supabase (Google OAuth, PostgreSQL, Row Level Security)
- **Deployment:** Fly.io (Singapore region), served via nginx
- **Icons:** Lucide React

---

## Local Development

### Prerequisites

- Node.js 18+
- Access to the shared Supabase project credentials (ask the platform admin)

### Setup

```bash
git clone https://github.com/veryresto/community-platform.git
cd community-platform
npm install
cp .env.example .env
# Fill in your Supabase credentials in .env
```

### Running the Dev Server

```bash
npm run dev
```

For cross-subdomain session sharing with other local apps, access the portal via:

```
http://community.localtest.me:5173
```

All `*.localtest.me` subdomains resolve to `127.0.0.1` automatically — no `/etc/hosts` setup required.

### Other Commands

```bash
npm run build    # Production build
npm run lint     # ESLint
npm run preview  # Preview production build locally
```

---

## Environment Variables

See [`.env.example`](./.env.example) for all required variables.

```env
VITE_SUPABASE_URL="https://your-supabase-project.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-supabase-anon-key"

# Ecosystem app URLs (used for portal hub directory links)
VITE_IPL_FINDER_URL="https://ipl-finder.veryresto.com"
VITE_REKAP_VIEWER_URL="https://rekap.veryresto.com"
```

---

## Deployment

Deployed to Fly.io via Docker + nginx.

```bash
fly deploy
```

Config: [`fly.toml`](./fly.toml) — app name `community-veryresto`, region `sin` (Singapore).

---

## Project Structure

```
community-platform/
  src/
    components/
      LoginScreen.tsx           # Google sign-in UI
      PendingApprovalScreen.tsx # Waiting room + profile info collection
      RejectedScreen.tsx        # Access denied screen
      EcosystemLandingScreen.tsx# App hub directory (post-approval)
      AdminDashboardScreen.tsx  # Governance center for admins/verifiers
    hooks/
      useAuth.tsx               # Auth context (session, signInWithGoogle, signOut)
      usePermissions.tsx        # Approval status + platform roles
    lib/
      supabase.ts               # Supabase client with cross-subdomain CookieStorage
  supabase/
    migrations/                 # Database schema and RLS policies
    functions/                  # Supabase Edge Functions
  docs/
    veryresto-identity-protocol.md  # Platform-agnostic auth contract
    auth-integration-guide.md       # Developer integration index
    auth/                           # Per-stack reference implementations
```
