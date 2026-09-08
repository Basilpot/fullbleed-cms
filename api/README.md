# Keybud API

Hono router lives in [`api/app.ts`](./app.ts). It runs inside same Vinext Worker as dashboard.

## Routes

- `GET /api/health`
- `GET /api/v1/pages`
- `GET /api/v1/pages/:slug`
- `GET /api/v1/services`
- `GET /api/v1/services/:slug`
- `GET /api/v1/posts`
- `GET /api/v1/posts/:slug`
- `GET /api/v1/authors`
- `GET /api/v1/categories`
- `GET /api/v1/tags`
- `GET /api/v1/redirects/resolve?from=/old-path`
- `POST /api/v1/inquiries`

Content routes require `Authorization: Bearer kb_pub_...` and return published content only.
Inquiry submissions use the same key and workspace origin allowlist.
