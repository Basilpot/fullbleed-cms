# Fullbleed documentation

Fullbleed is a lightweight, multitenant content system for publishing simple website
content without dragging in a full-scale CMS. It ships with a small admin dashboard to
manage content and media, plus a public, **read-only API** you can call from any website
with an **API key**.

## Two ways to run it

| | Cloud | Self-hosted |
|---|---|---|
| Who hosts it | The Fullbleed team | You |
| Data | Stored and backed up for you | Lives on your own Cloudflare account |
| Pricing | Paid subscription | Free (open source), just your infrastructure costs |
| Domain | `*.fullbleed.basilpot.com` | Your own custom domain |
| Setup | Sign up, start publishing | Follow the [self-hosting guide](self-hosting.md) |
| Best for | Managing multiple client sites without ops | Self-sovereign CMS, white-label hosting, tinkering |

Both versions run the exact same codebase and expose the same dashboard and public API.

## Feature overview

- **Multi-tenant workspaces** — one signup creates a workspace; a workspace is one
  site/tenant. Users belong to workspaces as owners or editors.
- **Content types** — Pages and Posts. Services are a type of page. Each has metadata (SEO title,
  description, canonical URL), an optional cover image, an author, a category, and tags.
- **Media library** — upload images to R2/CDN storage, reference them from your content;
  image URLs are served from your media domain.
- **Members** — invite teammates to a workspace as editors or owners; revoke at any time.
- **Inquiries (forms)** — your website can submit contact-form messages straight to the
  workspace through the public API; they appear in the dashboard's Inquiries area.
- **Redirects** — manage URL redirects and resolve them from your site via the API.
- **Public API** — a read-only JSON API authenticated with `kb_pub_…` publishable keys,
  for listing pages and posts (plus authors, categories and tags), resolving redirects,
  and submitting inquiries.
- **Platform admin** — on a hosted install, one account can manage all users and
  workspaces.

## Quick start (Cloud)

1. Sign up at [fullbleed.basilpot.com/signup](https://fullbleed.basilpot.com/signup) —
   your first email becomes the platform admin on a self-hosted install.
2. Open your workspace dashboard and create content: **Pages & Posts → Pages** (or Posts,
   and anything else under Pages comes out as a page.).
3. Add any assets you need in **Media**.
4. Open **API Access**, create a key, and copy it (shown only once).
5. Read the [Public API guide](public-api.md) and point your website at it.

Run your own instance instead? See [Self-hosting](self-hosting.md).

## Guides

- [Using the dashboard](dashboard.md) — the admin app end to end.
- [Public API & API keys](public-api.md) — authenticate and consume your content from any
  website.
- [Self-hosting](self-hosting.md) — deploy Fullbleed on your own Cloudflare account.