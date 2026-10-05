# Fullbleed

Multitenant CMS on Cloudflare Workers. vinext (Next.js 16 App Router, React 19) + Hono + D1 + R2, Tailwind CSS 4, shadcn/ui (new-york, `@/*` → package root).

```sh
pnpm dev              # vinext dev (localhost:3001, falls back if taken)
pnpm build            # vinext build
pnpm lint             # eslint (next/core-web-vitals + typescript); no-explicit-any is warn
pnpm deploy           # vinext-cloudflare deploy
```

Local D1: `pnpm exec wrangler d1 migrations apply fullbleed --local`. Note the CLI and the vinext dev server keep **separate** local DB files under `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/` — apply migrations to whichever one your running server reads.

## Architecture

- **One worker serves everything.** There is no separate API server and no dev proxy. `api/app.ts` is a Hono app mounted at `/api`; `app/api/[[...path]]/route.ts` forwards every `/api/*` request into `api.fetch(request, env)`. Dev and prod run the same `api/app.ts`.
- API route modules: `api/cms.ts`, `api/media.ts`, `api/team.ts` (members + invites), `api/platform.ts` (platform admin), `api/workspace.ts` (`workspaceFor`), plus `lib/server/public-api.ts` for the public `/api/v1/*` storefront API.
- **Auth**: PBKDF2 passwords + `fullbleed_session` cookie (`lib/server/auth.ts`). `sessionFor(token, slug?)` and `workspaceFor(c, slug?)` resolve the caller. With no `slug` they fall back to the caller's **most recent** `memberships` row (`created_at DESC, rowid DESC`) — that is where a freshly accepted invite lands. With a `slug` they scope to that workspace, which is how members of several workspaces manage each one.
- **Roles**: `owner` (full CRUD + member management) and `editor` (content only). Platform admins (`users.is_platform_admin`) manage all users from `/admin`; they are not staff accounts.
- Email goes out via Resend (`lib/server/email.ts`). **Resend resolves with `{ data: null, error }` instead of throwing** — always check `.error`. Never fire mail off a floating promise in a worker; `await` it or wrap it in `ctx.waitUntil()`. In-flight promises are dropped once the response returns.
- Dates: SQLite `CURRENT_TIMESTAMP` yields `YYYY-MM-DD HH:MM:SS` while JS `toISOString()` yields `YYYY-MM-DDTHH:MM:SSZ`. Compare with `datetime(col)` in SQL, or parse before comparing in JS — never raw string-compare the two formats.

## Routes

- `/login`, `/signup`, `/invite/[token]` (public). `/invite/[token]` links to `/signup?next=…` and `/login?next=…`; `next` is what carries the invite token through registration.
- `app/(dash)/[[...rest]]` resolves a bare dashboard path to `/workspace/<slug>/…`.
- `app/(dash)/workspace/[slug]/` holds dashboard, content, media, members, inquiries, API access. The layout re-resolves the session scoped to `[slug]`, so multi-workspace members are not bounced to their newest workspace.
- Sidebar menu is `components/app-sidebar.tsx` (`NAV_ITEMS`) — add new pages there.
- `docs/ARCHITECTURE.md` is the detailed reference and is accurate; `DESIGN.md` is authoritative for UI work.

## Limits

`workspaces.member_limit` caps members (5 via `migrations/0008_member_limit.sql`; new workspaces pass it explicitly in `app/api/auth/register/route.ts` because SQLite can't `ALTER COLUMN … SET DEFAULT`). Enforced at both invite and accept time in `api/team.ts`. There is no billing/plans UI yet.

## Checks

All scripts need a running server (`pnpm dev`, or `pnpm start` for wrangler on :8787) and drive it over HTTP:

```sh
scripts/members-check.sh          # invite path: register -> invite -> email outcome -> accept -> member cap
scripts/inquiry-check.sh          # public inquiry path: register -> site config -> key -> POST -> email outcome
scripts/media-check.sh
```
