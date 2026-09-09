# Keybud Architecture Guide

How the admin dashboard works end to end: UI, API, data, and the dev/prod split.

## Big picture

One Cloudflare Worker (built with Next.js via `vinext` + Hono) serves **both** the
admin UI **and** the API. The UI is a Next.js App Router app; every `/api/*`
request is answered by a Hono router that runs **in the same process** and talks
to a D1 database and R2 storage.

```
Browser (admin UI on :3001 dev / :8787 prod)
   │  fetch("/api/...", { credentials: "include" })
   ▼
Next.js route handler: app/api/[[...path]]/route.ts   ← the "catch-all"
   │  api.fetch(request, env)                          ← Hono, in-process
   ▼
api/app.ts  (mounts all feature routers)
   ├── /auth/*            app/api/auth/*                 (Next route handlers)
   ├── /admin             api/platform.ts    platform admin (users, suspend)
   ├── /members           api/team.ts        workspace members + invites
   ├── /blogs /info-page /media-library...    api/cms.ts / api/media.ts
   └── /v1/*              public storefront API (api-key + public pages)
   ▼
D1 (fullbleed) + R2 (MEDIA)
```

> The `api/members.ts` file was renamed to `api/team.ts` (route stays `/api/members`)
> to dodge a dev-server quirk — see "Dev server gotchas".

## Request flow in detail

1. **Client** (`lib/api.ts` → `apiFetch`, plus inline `fetch` in pages): always
   a relative `/api/...` URL with `credentials: "include"` (session cookie
   `fullbleed_session`).
2. **Next catch-all** `app/api/[[...path]]/route.ts` matches any `/api/*` that
   isn't a more specific file (e.g. `/api/auth/login`, `/api/health`). It calls
   `api.fetch(request, env)` with the `env` bindings from `cloudflare:workers`.
3. **Hono** (`api/app.ts`) dispatches by path to the feature routers. Everything
   except `/v1/*` requires a session; routers call `workspaceFor(c)` /
   `sessionFor(c)` from `api/workspace.ts` to scopes queries to the caller's
   current workspace.
4. **Storage**: D1 via `c.env.DB.prepare(...)`; media uploads to R2 via the
   `MEDIA` binding. Config in `wrangler.jsonc`.

### Response envelopes

Success: `{ data: ... }` (lists carry a `pagination` object). Errors:
`{ error: "..." }` with 4xx/5xx. The E2E tests rely on this shape.

## Auth & session

- Login/signup/logout are **Next route handlers** (`app/api/auth/*`) using real
  password hashing (`lib/server/auth.ts`) and a `fullbleed_session` cookie.
- Every other API validates the session, then resolves the **current workspace**
  = the caller's **most recent** `memberships` row (`created_at DESC, rowid DESC
  LIMIT 1`). Invited editors land on the workspace they were invited to.
- Suspended users (`users.disabled_at` set) are rejected at login (403) **and**
  their existing sessions stop resolving workspaces.
- Roles: `owner` (full CRUD + member management) and `editor` (content only).
  Platform admins (`users.is_platform_admin`) manage all users from `/admin` —
  they are NOT staff accounts; they are the people who control access/moderation.

## Workspaces, teams, members

- A top-level next-page loads the workspace, then a `/workspace/[slug]` group
  contains dashboard, posts/pages, media, members, etc. The sidebar routes live
  in `components/app-sidebar.tsx`.
- `/api/members` (file `api/team.ts`):
  - `GET /` → members + pending invitations.
  - `POST /` `{email}` → creates a 7-day invitation; returns the one-time
    `token`. **Token is only shown once** (DB stores its SHA-256 hash) — there
    is intentionally no "resend".
  - `GET /invitations/:token` → public metadata for the invite screen,
    `/invite/[token]`.
  - `POST /accept` `{token}` → joins the workspace (creates membership).
  - Owner-only: `PATCH /:userId` role changes, `DELETE /:userId`, and
    `DELETE /invitations/:id`. Last-owner/self-demote/self-remove are blocked.

## /admin (platform admin)

- `app/admin/layout.tsx` + `page.tsx` guard `is_platform_admin`; other users get
  bounced to their own dashboard. `GET /admin` used to be a `/login` redirect stub.
- `api/platform.ts` at `/api/admin`:
  - `GET /users` (search by name/email, paginated; includes each user's memberships).
  - `PATCH /users/:id` — grant/revoke platform admin.
  - `PATCH /users/:id/status` — suspend/unsuspend.
  - Self-changes and self-suspend are blocked with 400.
- To promote a user: set `PLATFORM_ADMIN_EMAIL` in `wrangler.jsonc`
  (register auto-promotes that address), or flip `is_platform_admin` directly.

## Public storefront API (`/api/v1/*`)

Storefronts read published content read-only using an API key
(`api_keys` table, `Authorization: Bearer kb_pub_*`). Implemented in
`lib/server/public-api.ts` via `api.all("/v1/*", ...)` in `api/app.ts`.
CORS is per-origin via `allowed_origins`. Full route list in `api/README.md`.

## Dev vs production

| | Dev (`pnpm dev`, port 3001) | Prod (deploy or `pnpm start`) |
|---|---|---|
| API resolution | `app/api/**` routes + catch-all, served by the vinext/vite dev server | the compiled Worker |
| Storage | local D1 via wrangler (`pnpm exec wrangler d1 migrations apply fullbleed --local`) | remote D1/R2 |

Both run the **same** `api/app.ts`. The production path is proven by the E2E
script (`/tmp/fullbleed-members-test.sh` → `pnpm build && pnpm start`, read the
port from `/tmp/fullbleed-wrangler.log`, run with `BASE=http://localhost:<port>/api`).

## Dev server gotchas

- **File-name vs URL collision:** vite dev serves the *source* of a project TS
  file when the URL path matches `api/<name>.ts`. `/api/members` matched
  `api/members.ts` and returned its source (`import { Hono }...`) → the browser
  error `Unexpected token 'i', "import { H"... is not valid JSON`. `/api/health`
  and `/api/admin/users` work because no `app/api/health`-or-`api/admin/users.ts`
  file collides. **Workaround:** avoid `api/<segment>.ts` names that equal a
  public API path. This is why the file is `api/team.ts` but the route is
  `/api/members`. After renaming, restart `pnpm dev` (vite caches the mapping).
- **Port 3000 belongs to other projects.** Some setups run unrelated backends on
  :3000; if `/api/*` responses start looking foreign (Express "Cannot GET...",
  `{"site":"localhost"}` health echoes), kill whatever squats on the port —
  fullbleed never proxies anywhere.
- LSP errors like `Cannot find module '@/components/...'` or `Uint8Array`/
  `BufferSource` in `lib/server/auth.ts` are stale/non-gating; `pnpm build` is
  the source of truth. Grep output sometimes mangles `log`→`n` on this machine;
  confirm strings by reading the file.

## Change checklist

1. Edit code, then `pnpm exec eslint <files>` (0 errors required; old warnings OK).
2. `pnpm build` (import errors here are real).
3. `pnpm start`, then run `/tmp/fullbleed-members-test.sh` against the reported port.
4. Confirm the affected page in `pnpm dev` (restart it if you renamed/moved files).
5. Migrations: write `migrations/NNNN_name.sql`, apply with
   `pnpm exec wrangler d1 migrations apply fullbleed --local`.