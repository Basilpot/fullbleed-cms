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

## Media (dashboard, cookie auth required)

- `GET /api/media-library?page&limit&search`
- `GET /api/media-library/:id`
- `POST /api/media-library` — insert from external URL (metadata-only row)
- `PATCH /api/media-library/:id` — update alt/caption/title/description
- `DELETE /api/media-library/:id`
- `POST /api/media-library/upload` — multipart `file` → R2 + metadata
- `POST /api/media-library/upload/multiple` — multipart `images` (repeatable)
- `POST /api/media-library/batch` — `{ "ids": [...] }` → id → metadata map
- `GET /api/media-library/file/*` — public object read (streams R2)

Uploaded files live in the `MEDIA` R2 bucket under `{workspace_id}/{uuid}/{filename}`;
`url` is `/api/media-library/file/{key}` (absolute path), usable directly in `<img>`.

```bash
# Upload check (valid `fullbleed_session` cookie from any logged-in browser session)
curl -s -b $'fullbleed_session=YOUR_SESSION_TOKEN' \
  -F file=@some-image.png http://localhost:8787/api/media-library/upload
```
