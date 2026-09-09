# Fullbleed

A lightweight, multitenant content system for publishing simple website content
without dragging in a full-scale CMS. Runs as a single Cloudflare Worker with a D1
database and an R2 media bucket.

**Publish web content** — pages and posts with author, category, and tags —
manage images, handle contact-form inquiries and redirects, invite team members, and
serve everything to any website through a read-only **public API** authenticated with
`kb_pub_…` keys.

## Cloud vs. self-hosted

| | Cloud | Self-hosted |
|---|---|---|
| Hosting | Hosted by us — you pay & go | Your Cloudflare account, free |
| Setup | Sign up at [fullbleed.basilpot.com](https://fullbleed.basilpot.com) | [Self-hosting guide](https://fullbleed.basilpot.com/docs/self-hosting) |
| Codebase | Identical | Identical |

## Feature highlights

- Multi-tenant **workspaces** with owner/editor roles and email invitations
- **Pages** and **Posts** content types with SEO metadata and cover media. Services are
  a type of page.
- **Media library** on object storage with public image URLs
- **Public JSON API** — published content, taxonomy, redirect resolution, and inquiry
  submission via publishable API keys
- **Inquiries** inbox for contact forms submitted from your websites
- **Platform admin** panel for managing users across workspaces
- Custom-domain worker and media host; `workers.dev` works too

## Documentation

Full user + developer docs are hosted at
**[fullbleed.basilpot.com/docs](https://fullbleed.basilpot.com/docs)**:

- [Overview](https://fullbleed.basilpot.com/docs)
- [Using the dashboard](https://fullbleed.basilpot.com/docs/dashboard)
- [Public API & API keys](https://fullbleed.basilpot.com/docs/public-api)
- [Self-hosting](https://fullbleed.basilpot.com/docs/self-hosting)

## Using the API in 30 seconds

Create a key in **API Access**, then:

```bash
curl -H "Authorization: Bearer kb_pub_YOUR_KEY" \
  https://fullbleed.basilpot.com/api/v1/posts?limit=5
```

```json
{
  "data": [ { "id": "…", "type": "post", "title": "…", "bodyHtml": "…" } ],
  "meta": { "page": 1, "limit": 5, "total": 12 }
}
```

Send contact-form inquiries with `POST /api/v1/inquiries`. Only published content is
ever returned. See the [Public API docs](https://fullbleed.basilpot.com/docs/public-api)
for every endpoint.

## Development

```sh
pnpm install
pnpm exec wrangler d1 migrations apply fullbleed --local   # local dev DB
pnpm dev                            # dev server on http://localhost:3001
pnpm build                          # production build
pnpm start                          # run the built worker locally
```

Invitation emails go through Resend: set `RESEND_API_KEY` in a local `.dev.vars` file
(see `.dev.vars.example`) and as a production secret (`wrangler secret put`).
`RESEND_FROM` is a worker var in `wrangler.jsonc`.

## Deploy

See the [self-hosting guide](https://fullbleed.basilpot.com/docs/self-hosting) for
full steps (D1, R2, migrations, custom domains). In short:

```sh
pnpm run deploy   # not `pnpm deploy` — that's the pnpm built-in
```

## Repository layout

- `app/` — Next.js App Router UI (dashboard, docs site, auth pages)
- `api/` — the Hono API: `/api/*` for the dashboard, `/api/v1/*` for the public API
- `lib/` — shared server logic (auth, sessions, media helpers, email)
- `migrations/` — D1 SQL migrations
- `docs/` — documentation source (markdown)

Developer architecture notes: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Setup guide

Local development, self-hosting, and production deployment are covered in the
[Self-hosting guide](https://fullbleed.basilpot.com/docs/self-hosting). The short
version:

```sh
git clone git@github.com:Basilpot/fullbleed-cms.git
cd fullbleed-cms
pnpm install
cp .dev.vars.example .dev.vars          # add RESEND_API_KEY if you want emails
pnpm exec wrangler d1 migrations apply fullbleed --local
pnpm dev                                # http://localhost:3001
```

For your own Cloudflare deployment (D1, R2, custom domains), follow every step in
the self-hosting guide.

## License

[MIT](LICENSE)

## Contributions

This project is developed by Basilpot and is **not accepting external
contributions**. Issues and feature requests are tracked internally. You are
welcome to fork and self-host under the MIT license.