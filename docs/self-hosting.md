# Self-hosting

Fullbleed is a single Cloudflare Worker. It needs a Cloudflare account, a **D1**
database, an **R2** bucket (media), and — unless you stay on `workers.dev` — a domain
that is a zone in your account. All state is in D1 and R2; the app itself is stateless.

## Prerequisites

- Node.js 20+ and [pnpm](https://pnpm.io)
- A Cloudflare account with Workers enabled
- A domain zone in Cloudflare (e.g. `example.com`) if you want a custom domain
- The [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (or `pnpm exec wrangler`)

Login once:

```bash
pnpm install
pnpm exec wrangler login
```

## 1. Configure

Edit `wrangler.jsonc`:

| Key | What to put |
|---|---|
| `name` | Your worker name, e.g. `fullbleed` |
| `routes[].pattern` | Your custom domain, e.g. `cms.example.com` with `custom_domain: true` |
| `d1_databases[0].database_name` | The name you'll use for the D1 database |
| `d1_databases[0].database_id` | From `wrangler d1 create` (step 2) |
| `r2_buckets[0].bucket_name` | Your R2 bucket name |
| `vars.APP_URL` | `https://cms.example.com` (used for email links) |
| `vars.MEDIA_URL` | `https://media.example.com` (public media URL, step 4) |
| `vars.RESEND_FROM` | Sender line for emails, e.g. `Fullbleed <fullbleed@basilpot.com>` |
| `vars.PLATFORM_ADMIN_EMAIL` | Email that auto-promotes to platform admin on signup |

## 2. Create the database and bucket

```bash
pnpm exec wrangler d1 create fullbleed
```

Copy the returned `database_id` into `wrangler.jsonc`, then create the media bucket:

```bash
pnpm exec wrangler r2 bucket create fullbleed-media
```

## 3. Apply migrations

Local (miniflare, used by `pnpm dev`):

```bash
pnpm exec wrangler d1 migrations apply fullbleed --local
```

Production (the live D1 database):

```bash
pnpm exec wrangler d1 migrations apply fullbleed --remote
```

## 4. Custom domains (recommended)

Connect the worker domain:

```bash
pnpm exec wrangler deploy
```

Then connect the media bucket so `MEDIA_URL` actually serves files:

```bash
pnpm exec wrangler r2 bucket domain add fullbleed-media --domain media.example.com --zone-id YOUR_ZONE_ID
```

Get `YOUR_ZONE_ID` from the Cloudflare dashboard (Domain → your zone → overview).

Using `workers.dev` alone works for the dashboard, but the API path you hand to
websites is nicer on your own domain.

## 5. Email (invitations)

Member invitations are sent with [Resend](https://resend.com). The sender address
must be a domain verified in Resend. Store the API key as a **secret** (never commit
it):

```bash
pnpm exec wrangler secret put RESEND_API_KEY
```

For local development, put `RESEND_API_KEY=…` in a `.dev.vars` file (see
`.dev.vars.example`; `.dev.vars` is gitignored).

If `RESEND_API_KEY` is not set, invites are created but no email is sent — the invite
link is still returned to the inviter's dashboard, so local development works without
a key.

## 6. Deploy & verify

```bash
pnpm run deploy
```

> `pnpm run deploy` is a full worker deploy. Bare `pnpm deploy` is a pnpm built-in and
> will not deploy the worker.

Check health:

```bash
curl https://cms.example.com/api/health
# {"service":"fullbleed-api","status":"ok",…}
```

## 7. First signup → platform admin

Sign up at `/signup` using the email in `PLATFORM_ADMIN_EMAIL`. That account is
auto-promoted to platform admin and can manage all users at `/admin`.

## 8. Local development

```bash
pnpm dev          # dev server on http://localhost:3001
pnpm build        # production build
pnpm start        # run the built worker locally (wrangler dev)
```

## Allowed origins (API + CORS)

Browser requests to the public API (GET endpoints and inquiry submission) carry an
`Origin` header. Fullbleed checks it against the workspace's `allowed_origins` list
and rejects unknown origins with `403 Origin not allowed`. Server-to-server requests
without an `Origin` header skip the check.

Add your site's origin to a workspace (replace the UUID with your workspace id, found
in `workspaces.id`):

```sql
INSERT INTO allowed_origins (workspace_id, origin) VALUES
  ('<workspace-id>', 'https://yoursite.com');
```

Deployments with reporting turned on (`observability.enabled`) surface these queries in
the Cloudflare dashboard's **Logs** and **Metrics** tabs.

## Architecture

For a deep dive into request flow, auth/sessions, workspace scoping, and the public
API internals, read [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) in the repo (developer
documentation, not user docs).