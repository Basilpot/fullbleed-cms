import { env } from "cloudflare:workers";

type ApiKeyWorkspace = { workspace_id: string; media_url: string };

const encoder = new TextEncoder();

function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hash(value: string) {
  return hex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

function json(data: unknown, status = 200, headers?: HeadersInit) {
  return Response.json(data, { status, headers });
}

function apiKey(request: Request) {
  const value = request.headers.get("authorization");
  return value?.match(/^Bearer (kb_pub_[A-Za-z0-9_-]+)$/)?.[1] ?? null;
}

async function workspaceFor(request: Request): Promise<ApiKeyWorkspace | null> {
  const key = apiKey(request);
  if (!key) return null;

  return env.DB.prepare(
    `SELECT api_keys.workspace_id, ? AS media_url
     FROM api_keys
     WHERE api_keys.key_hash = ? AND api_keys.revoked_at IS NULL`,
  )
    .bind(env.MEDIA_URL, await hash(key))
    .first<ApiKeyWorkspace>();
}

async function cors(request: Request, workspaceId?: string) {
  const origin = request.headers.get("origin");
  if (!origin) return new Headers();

  const query = workspaceId
    ? env.DB.prepare("SELECT 1 FROM allowed_origins WHERE workspace_id = ? AND origin = ?").bind(workspaceId, origin)
    : env.DB.prepare("SELECT 1 FROM allowed_origins WHERE origin = ?").bind(origin);
  const allowed = await query.first();
  if (!allowed) return null;

  return new Headers({
    "access-control-allow-origin": origin,
    "access-control-allow-headers": "Authorization, Content-Type",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-max-age": "86400",
    vary: "Origin",
  });
}

function pagination(url: URL) {
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get("limit") ?? "20", 10) || 20));
  return { page, limit, offset: (page - 1) * limit };
}

function serialize(row: Record<string, unknown>, mediaUrl: string) {
  const coverKey = row.cover_object_key as string | null;
  return {
    id: row.id,
    type: row.kind,
    title: row.title,
    slug: row.slug,
    bodyHtml: row.body_html,
    status: row.status,
    publishedAt: row.published_at,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    canonicalUrl: row.canonical_url,
    coverImage: coverKey ? `${mediaUrl}/${coverKey}` : null,
    author: row.author_id ? { id: row.author_id, name: row.author_name, slug: row.author_slug } : null,
    category: row.category_id ? { id: row.category_id, name: row.category_name, slug: row.category_slug } : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const contentSelect = `
  SELECT content.*, media.object_key AS cover_object_key,
         authors.name AS author_name, authors.slug AS author_slug,
         categories.name AS category_name, categories.slug AS category_slug
  FROM content
  LEFT JOIN media ON media.id = content.cover_media_id
  LEFT JOIN authors ON authors.id = content.author_id
  LEFT JOIN categories ON categories.id = content.category_id`;

async function tagsFor(contentIds: string[]) {
  if (!contentIds.length) return new Map<string, Array<{ id: string; name: string; slug: string }>>();
  const placeholders = contentIds.map(() => "?").join(", ");
  const { results } = await env.DB.prepare(
    `SELECT content_tags.content_id, tags.id, tags.name, tags.slug
     FROM content_tags JOIN tags ON tags.id = content_tags.tag_id
     WHERE content_tags.content_id IN (${placeholders}) ORDER BY tags.name`,
  ).bind(...contentIds).all<{ content_id: string; id: string; name: string; slug: string }>();
  return results.reduce((map, tag) => {
    const tags = map.get(tag.content_id) ?? [];
    tags.push({ id: tag.id, name: tag.name, slug: tag.slug });
    map.set(tag.content_id, tags);
    return map;
  }, new Map<string, Array<{ id: string; name: string; slug: string }>>());
}

async function listContent(url: URL, workspace: ApiKeyWorkspace, kind: "page" | "service" | "post") {
  const { page, limit, offset } = pagination(url);
  const conditions = ["content.workspace_id = ?", "content.kind = ?", "content.status = 'published'", "content.deleted_at IS NULL"];
  const values: string[] = [workspace.workspace_id, kind];

  const category = url.searchParams.get("category");
  const author = url.searchParams.get("author");
  const tag = url.searchParams.get("tag");
  if (category && kind === "post") { conditions.push("categories.slug = ?"); values.push(category); }
  if (author && kind === "post") { conditions.push("authors.slug = ?"); values.push(author); }
  if (tag && kind === "post") {
    conditions.push("EXISTS (SELECT 1 FROM content_tags ct JOIN tags t ON t.id = ct.tag_id WHERE ct.content_id = content.id AND t.slug = ?)");
    values.push(tag);
  }
  const where = conditions.join(" AND ");
  const [items, total] = await env.DB.batch([
    env.DB.prepare(`${contentSelect} WHERE ${where} ORDER BY content.published_at DESC, content.created_at DESC LIMIT ? OFFSET ?`).bind(...values, limit, offset),
    env.DB.prepare(`SELECT COUNT(*) AS total FROM content
      LEFT JOIN authors ON authors.id = content.author_id
      LEFT JOIN categories ON categories.id = content.category_id
      WHERE ${where}`).bind(...values),
  ]);
  const rows = items.results as Record<string, unknown>[];
  const tags = kind === "post" ? await tagsFor(rows.map((row) => row.id as string)) : new Map();
  return json({
    data: rows.map((row) => ({ ...serialize(row, workspace.media_url), tags: tags.get(row.id as string) ?? [] })),
    meta: { page, limit, total: Number((total.results[0] as { total: number }).total) },
  });
}

async function getContent(workspace: ApiKeyWorkspace, kind: "page" | "service" | "post", slug: string) {
  const row = await env.DB.prepare(`${contentSelect}
    WHERE content.workspace_id = ? AND content.kind = ? AND content.slug = ? AND content.status = 'published' AND content.deleted_at IS NULL`)
    .bind(workspace.workspace_id, kind, slug).first<Record<string, unknown>>();
  if (!row) return json({ error: "Not found" }, 404);
  const tags = kind === "post" ? await tagsFor([row.id as string]) : new Map();
  return json({ data: { ...serialize(row, workspace.media_url), tags: tags.get(row.id as string) ?? [] } });
}

async function taxonomy(workspace: ApiKeyWorkspace, table: "authors" | "categories" | "tags") {
  const fields = table === "authors" ? "id, name, slug, bio AS description, image_media_id" : "id, name, slug, description";
  const { results } = await env.DB.prepare(`SELECT ${fields} FROM ${table} WHERE workspace_id = ? ORDER BY name`)
    .bind(workspace.workspace_id).all();
  return json({ data: results });
}

export async function publicApi(request: Request, path: string[]) {
  if (request.method === "OPTIONS") {
    const headers = await cors(request);
    return headers ? new Response(null, { status: 204, headers }) : new Response(null, { status: 403 });
  }
  if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const workspace = await workspaceFor(request);
  if (!workspace) return json({ error: "Invalid API key" }, 401);
  const headers = await cors(request, workspace.workspace_id);
  if (!headers) return json({ error: "Origin not allowed" }, 403);
  const url = new URL(request.url);
  const [resource, slug] = path;
  let response: Response;
  if (resource === "pages") response = slug ? await getContent(workspace, "page", slug) : await listContent(url, workspace, "page");
  else if (resource === "services") response = slug ? await getContent(workspace, "service", slug) : await listContent(url, workspace, "service");
  else if (resource === "posts") response = slug ? await getContent(workspace, "post", slug) : await listContent(url, workspace, "post");
  else if (resource === "authors" || resource === "categories" || resource === "tags") response = await taxonomy(workspace, resource);
  else if (resource === "redirects" && path[1] === "resolve") {
    const source = url.searchParams.get("from");
    if (!source?.startsWith("/")) response = json({ error: "from must be an absolute path" }, 400);
    else {
      const redirect = await env.DB.prepare("SELECT source_path, target_path, permanent FROM redirects WHERE workspace_id = ? AND source_path = ?")
        .bind(workspace.workspace_id, source).first();
      response = redirect ? json({ data: redirect }) : json({ error: "Not found" }, 404);
    }
  } else response = json({ error: "Not found" }, 404);

  headers.forEach((value, key) => response.headers.set(key, value));
  return response;
}
