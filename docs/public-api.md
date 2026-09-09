# Public API & API keys

The public API lets any website read a workspace's published content — posts, pages,
posts, taxonomy, redirects — and submit contact-form inquiries. It is **read-only**
(plus inquiry submission), JSON everywhere, and authenticated with a publishable key.

## Base URL

```
https://fullbleed.basilpot.com/api/v1
```

On a self-hosted install this is `{your-app}/api/v1`. Every endpoint below is relative
to this base.

The API returns **published content only** — drafts and deleted items never appear.

## 1. Create an API key

1. In the dashboard open **API Access** (`/workspace/{slug}/api-access`).
2. Click **Create API key**. A key is generated and shown once:
   ```
   kb_pub_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   ```
3. Copy it immediately — it is not shown again. You can always create more.

Keys are workspace-scoped, prefixed `kb_pub_`, 30 random characters. Store the key as an
environment variable or build secret on your website — it is *publishable* (read-only),
but keep it out of public git history.

### Revoking

In **API Access**, revoke any key to immediately reject its requests. Requests succeed
only while `revoked_at` is null.

## 2. Authenticate

Send the key as a bearer token:

```
Authorization: Bearer kb_pub_…
```

Every request without a valid key returns `401`:

```json
{ "error": "Invalid API key" }
```

## 3. Requests from browsers (CORS)

GET endpoints support cross-origin (CORS) requests from your website:

- A browser request carries an `Origin` header. Fullbleed checks it against the
  workspace's **allowed-origin allowlist** (`allowed_origins`) and returns `403
  Origin not allowed` for unknown origins.
- Requests with **no Origin** (curl, server-to-server, mobile apps) skip the check.
- Preflight `OPTIONS` is answered automatically.

> Managed cloud: the origin allowlist is currently administered at the data layer,
> being surfaced in the dashboard soon. Self-hosted installs manage it directly — see
> *Allowed origins* in the [Self-hosting guide](self-hosting.md).

## 4. Endpoints

### Content lists

`GET /pages`, `GET /services`, `GET /posts`

Each returns a paginated list, newest published first. Posts support filters.

**Query parameters**

| Param | Applies | Meaning |
|---|---|---|
| `page` | all | Page number, 1-based. Default `1`. |
| `limit` | all | Page size. Default `20`, max `100`. |
| `category` | posts | Only posts in category with this slug. |
| `author` | posts | Only posts by author (author slug). |
| `tag` | posts | Only posts carrying this tag slug. |

**Response envelope**

```json
{
  "data": [ /* content items */ ],
  "meta": { "page": 1, "limit": 20, "total": 37 }
}
```

> Default list page size is `20` (dashboard admin endpoints default to `10`).

### Single items

`GET /pages/:slug`, `GET /services/:slug`, `GET /posts/:slug`

```json
{ "data": { /* content item */ } }
```

`404 { "error": "Not found" }` when the slug has no published non-deleted item.

### Content item shape

| Field | Type | Notes |
|---|---|---|
| `id` | string | UUID |
| `type` | `page` \| `service` \| `post` | Content kind |
| `title` | string | |
| `slug` | string | |
| `bodyHtml` | string | Rendered HTML for the content body |
| `status` | string | Always `"published"` here |
| `publishedAt` | string | ISO timestamp |
| `metaTitle` | string \| null | SEO title |
| `metaDescription` | string \| null | SEO description |
| `canonicalUrl` | string \| null | |
| `coverImage` | string \| null | Absolute URL on your media domain, ready for `<img>` |
| `author` | `{ id, name, slug }` \| null | Posts |
| `category` | `{ id, name, slug }` \| null | Posts |
| `tags` | `{ id, name, slug }[]` | Posts |
| `createdAt` | string | ISO timestamp |
| `updatedAt` | string | ISO timestamp |

### Taxonomy

`GET /authors`, `GET /categories`, `GET /tags`

```json
{ "data": [ { "id": "…", "name": "…", "slug": "…" } ] }
```

Authors additionally include `description` (bio) and `image_media_id`.

### Redirects

`GET /redirects/resolve?from=/old-path`

`/old-path` must start with `/`. Returns the target if it matches:

```json
{ "data": { "source_path": "/old-path", "target_path": "/new-path", "permanent": 1 } }
```

or `404 { "error": "Not found" }`.

### Inquiries (contact form)

`POST /inquiries`

Accepts JSON:

```json
{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "phone": "+1 555 0100",
  "subject": "Project inquiry",
  "message": "We’d love to work with you."
}
```

Only `name`, `email` and `message` are required (email must contain `@`). If the request
carries an `Origin`, it must be in the workspace's allowed-origin allowlist.

Success (201) → `{ "data": { "received": true } }`. The message then appears in the
dashboard under **Inquiries**.

## 5. Example: rendering your blog

`GET /posts?limit=50` then render `bodyHtml` as trusted, server-produced HTML:

```ts
const res = await fetch("https://fullbleed.basilpot.com/api/v1/posts?limit=50", {
  headers: { Authorization: "Bearer " + process.env.FULLBLEED_API_KEY },
});
const { data: posts } = await res.json();
```

```tsx
{posts.map((post) => (
  <article key={post.id}>
    <h2>{post.title}</h2>
    {post.coverImage && <img src={post.coverImage} alt="" />}
    <div dangerouslySetInnerHTML={{ __html: post.bodyHtml }} />
    <small>
      {post.publishedAt} · {post.author?.name} · {post.category?.name}
    </small>
  </article>
))}
```

## 6. Example: contact form

From a script, page, or edge function on your own origin (no Origin header, so no
allowlist needed):

```js
const res = await fetch("https://fullbleed.basilpot.com/api/v1/inquiries", {
  method: "POST",
  headers: {
    Authorization: "Bearer " + process.env.FULLBLEED_API_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ name, email, message }),
});
```

To submit from a browser directly, the page's origin must be on the workspace's
allowed-origin allowlist.

## 7. Errors

All errors use the `{ "error": "…" }` shape:

| Status | Meaning |
|---|---|
| `400` | Invalid request (e.g. `redirects/resolve` without a leading `/`) |
| `401` | Missing or invalid API key |
| `403` | `Origin` header not on the workspace allowlist |
| `404` | Unknown endpoint, or nothing published for the slug/path |
| `405` | Method not allowed (all content endpoints are GET) |

## Quick curl check

```bash
curl -H "Authorization: Bearer kb_pub_…" \
  https://fullbleed.basilpot.com/api/v1/posts?limit=1
```