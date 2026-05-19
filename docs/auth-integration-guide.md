# Auth Integration Guide

> **For resident developers building apps in the Veryresto ecosystem.**  
> This guide explains how to authenticate users via the **Community Platform** (`community.veryresto.com`) and check their access status from your own application.

---

## Overview

The Veryresto community platform is the **single identity provider** for all resident apps. It handles:

- Google OAuth sign-in
- Resident approval/rejection workflow
- Role and permission management

Your app does **not** manage users directly. Instead, it:

1. Redirects unauthenticated users to the community portal
2. Reads the shared auth cookie to validate the session
3. Queries the shared Supabase database to check permissions

---

## How It Works

```
User visits your app
        │
        ▼
┌───────────────────┐      Not logged in      ┌─────────────────────────┐
│    Your App       │ ─────────────────────── │  community.veryresto.com │
│  (e.g. my-app)   │ ◄───────────────────── │  (Google OAuth + portal) │
└───────────────────┘    redirect back with   └─────────────────────────┘
        │                  auth cookie set
        ▼
Read cookie → Verify session with Supabase → Check approval + permissions
```

The shared session is stored in a cookie named `veryresto-auth` on the `.veryresto.com` domain, which all subdomains can read.

---

## Prerequisites

- Your app is deployed on a subdomain of `veryresto.com` (e.g., `my-app.veryresto.com`)
- You have access to the shared **Supabase project** credentials (URL + anon key). Ask the platform admin for these.
- You have registered your app's URL in the **community platform allowlist** (see [Step 5](#step-5-register-your-app)).

---

## Step 1: Install Supabase Client

```bash
npm install @supabase/supabase-js
```

---

## Step 2: Copy the Cookie-Based Supabase Client

The community platform uses a **custom cookie storage** so sessions are shared across subdomains.  
Copy this client setup into your project (e.g., `src/lib/supabase.ts` or `src/supabase.js`):

```typescript
import { createClient } from '@supabase/supabase-js';
import type { SupportedStorage } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;       // or import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!; // or import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// --- Cookie Storage (required for cross-subdomain session sharing) ---

const getCookieDomain = (): string => {
  const hostname = window.location.hostname;
  if (hostname.endsWith('.localtest.me') || hostname === 'localtest.me') return '.localtest.me';
  if (hostname.endsWith('.veryresto.com') || hostname === 'veryresto.com') return '.veryresto.com';
  return hostname;
};

const isLocalHostOrIP = (hostname: string): boolean =>
  hostname === 'localhost' || hostname === '127.0.0.1' || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);

// Parses the JWT access token to reconstruct the User object (needed after cross-domain redirect)
const parseJwt = (token: string) => {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(window.atob(base64).split('').map(c =>
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
  } catch { return null; }
};

class CookieStorage implements SupportedStorage {
  private domain = getCookieDomain();
  private isLocalOrIP = isLocalHostOrIP(this.domain);

  getItem(key: string): string | null {
    const parts = `; ${document.cookie}`.split(`; ${key}=`);
    if (parts.length !== 2) return null;
    let val = decodeURIComponent(parts.pop()!.split(';').shift()!);
    try {
      const session = JSON.parse(val);
      if (session?.access_token && !session.user) {
        const payload = parseJwt(session.access_token);
        if (payload) {
          session.user = {
            id: payload.sub, aud: payload.aud, role: payload.role,
            email: payload.email, phone: payload.phone,
            app_metadata: payload.app_metadata || {},
            user_metadata: payload.user_metadata || {},
            created_at: payload.created_at || new Date().toISOString(),
          };
          return JSON.stringify(session);
        }
      }
    } catch { /* not a session JSON, return raw */ }
    return val;
  }

  setItem(key: string, value: string): void {
    let stored = value;
    try {
      const session = JSON.parse(value);
      if (session?.access_token && session?.refresh_token) {
        // Strip heavy user metadata to stay within the 4KB cookie size limit
        stored = JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
          expires_in: session.expires_in,
          token_type: session.token_type || 'bearer',
        });
      }
    } catch { /* non-session value, store as-is */ }

    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
    const domain = this.isLocalOrIP ? '' : `;domain=${this.domain}`;
    const secure = window.location.protocol === 'https:' ? ';Secure' : '';
    document.cookie = `${key}=${encodeURIComponent(stored)};expires=${expires}${domain};path=/;SameSite=Lax${secure}`;
  }

  removeItem(key: string): void {
    const domain = this.isLocalOrIP ? '' : `;domain=${this.domain}`;
    const secure = window.location.protocol === 'https:' ? ';Secure' : '';
    document.cookie = `${key}=;expires=Thu, 01 Jan 1970 00:00:00 UTC${domain};path=/;SameSite=Lax${secure}`;
  }
}

// --- Export the shared client ---
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'veryresto-auth',   // ⚠️ Must match the community platform's storage key
    storage: new CookieStorage(),
    persistSession: true,
    autoRefreshToken: true,
  },
});
```

> **Important:** The `storageKey` must remain `'veryresto-auth'`. Changing it will prevent your app from reading the shared session cookie.

---

## Step 3: Redirect Unauthenticated Users to the Portal

When a user is not logged in, redirect them to the community portal with a `redirect_to` parameter so they come back to your app after signing in.

```typescript
const PORTAL_URL = 'https://community.veryresto.com';

export function redirectToPortal() {
  const returnUrl = encodeURIComponent(window.location.href);
  window.location.href = `${PORTAL_URL}/?redirect_to=${returnUrl}`;
}
```

For **local development**, use:

```typescript
const PORTAL_URL = 'http://community.localtest.me:5173';
```

> The portal validates `redirect_to` against an **allowlist of trusted origins**. Make sure your app's origin is registered (see [Step 5](#step-5-register-your-app)).

---

## Step 4: Check User Session and Approval Status

After the user returns from the portal, verify the session and check that the account is approved before granting access.

```typescript
import { supabase } from './lib/supabase';
import { redirectToPortal } from './auth';

async function initApp() {
  // 1. Get the current session from the shared cookie
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    // No session — send to portal
    redirectToPortal();
    return;
  }

  const userId = session.user.id;

  // 2. Check approval status from the profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('approval_status, house_number')
    .eq('id', userId)
    .maybeSingle();

  if (!profile || profile.approval_status !== 'approved') {
    // Account pending or rejected — do not grant access
    showAccessDeniedMessage();
    return;
  }

  // 3. (Optional) Check app-specific permissions using the namespaced helper
  const { data: hasPermission } = await supabase
    .rpc('has_namespaced_permission', {
      user_id: userId,
      namespaced_perm: 'my_app.read_data',   // format: '<app_slug>.<permission_name>'
    });

  if (!hasPermission) {
    showPermissionDeniedMessage();
    return;
  }

  // ✅ User is authenticated, approved, and has the required permission
  renderApp(session.user, profile);
}
```

### Approval Status Values

| `approval_status` | Meaning |
|---|---|
| `pending` | New account, awaiting admin review |
| `approved` | Resident verified — grant full access |
| `rejected` | Account denied — show rejection screen |
| `suspended` | Account suspended — treat as rejected |

---

## Step 5: Register Your App

You need to do **two things** to integrate with the portal:

### A. Add your origin to the community platform's allowlist

Open `community-platform/src/App.tsx` and add your app's production and local URLs to `ALLOWED_ORIGINS`:

```typescript
const ALLOWED_ORIGINS = [
  // ... existing entries ...
  'https://my-app.veryresto.com',       // ← add production URL
  'http://my-app.localtest.me:3000',    // ← add local dev URL
];
```

Submit this as a pull request or ask the platform admin to add it.

### B. (Optional) Register your app in the database for RBAC

If your app has its own permission model, register it in the `applications` table so the admin dashboard can manage per-app roles:

```sql
-- Run this migration once in the shared Supabase project
INSERT INTO public.applications (slug, name, description, url)
VALUES (
  'my_app',
  'My App Name',
  'Brief description of what your app does',
  'https://my-app.veryresto.com'
) ON CONFLICT (slug) DO NOTHING;

-- Define your app's permissions
INSERT INTO public.app_permissions (app_id, name, description)
SELECT id, 'read_data', 'View app data'
FROM public.applications WHERE slug = 'my_app'
ON CONFLICT (app_id, name) DO NOTHING;

-- Define your app's roles
INSERT INTO public.app_roles (app_id, name, description)
SELECT id, 'resident', 'Standard resident access'
FROM public.applications WHERE slug = 'my_app'
ON CONFLICT (app_id, name) DO NOTHING;

-- Bind permissions to roles
INSERT INTO public.app_role_permissions (app_role_id, permission_id)
SELECT ar.id, ap.id
FROM public.app_roles ar
JOIN public.app_permissions ap ON ar.app_id = ap.app_id
JOIN public.applications app ON ar.app_id = app.id
WHERE app.slug = 'my_app' AND ar.name = 'resident' AND ap.name = 'read_data'
ON CONFLICT DO NOTHING;
```

Once registered, the **Admin Center** (`community.veryresto.com` → Admin Center) can assign app roles to individual residents via the dashboard.

---

## Local Development Setup

To share sessions during local development, both apps must be on subdomains of the same hostname. Use [localtest.me](https://localtest.me) — all subdomains resolve to `127.0.0.1` automatically, no `/etc/hosts` setup needed.

| Service | Local URL |
|---|---|
| Community Portal | `http://community.localtest.me:5173` |
| Your App | `http://my-app.localtest.me:<your-port>` |

With this setup, the `veryresto-auth` cookie is shared across subdomains of `localtest.me` automatically.

---

## Environment Variables

Add these to your `.env` file:

```env
# Shared Supabase project (same credentials as community-platform)
VITE_SUPABASE_URL="https://your-supabase-project.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-supabase-anon-key"

# Portal URL (used for redirect)
VITE_PORTAL_URL="https://community.veryresto.com"
```

> For server-side apps (Node.js), use `SUPABASE_URL` and `SUPABASE_ANON_KEY` without the `VITE_` prefix, and implement the session check on the server using the Supabase service role or SSR helpers.

---

## Server-Side / Backend Apps (Node.js)

For backend apps that need to verify a session (e.g., an Express API), use the Supabase client to verify the JWT from the cookie:

```javascript
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function verifySession(req, res, next) {
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(/veryresto-auth=([^;]+)/);

  if (!match) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const session = JSON.parse(decodeURIComponent(match[1]));
    const { data: { user }, error } = await supabase.auth.getUser(session.access_token);

    if (error || !user) return res.status(401).json({ error: 'Invalid session' });

    // Check approval status
    const { data: profile } = await supabase
      .from('profiles')
      .select('approval_status')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.approval_status !== 'approved') {
      return res.status(403).json({ error: 'Account not approved' });
    }

    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Session parse error' });
  }
}
```

---

## Summary Checklist

- [ ] Install `@supabase/supabase-js`
- [ ] Copy the `CookieStorage` client (`storageKey: 'veryresto-auth'`)
- [ ] Add redirect-to-portal logic for unauthenticated users
- [ ] Check `profiles.approval_status === 'approved'` before granting access
- [ ] Add your app's origin to `ALLOWED_ORIGINS` in `community-platform/src/App.tsx`
- [ ] (Optional) Register your app's slug and permissions in the database
- [ ] Use `localtest.me` subdomains for local development
- [ ] Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in your `.env`
