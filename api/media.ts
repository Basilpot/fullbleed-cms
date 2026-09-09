import { Hono, type Context } from "hono";
import { workspaceFor } from "./workspace";
import type { ApiEnv } from "./app";

export const media = new Hono<ApiEnv>();

type MediaRow = {
  id: string;
  object_key: string;
  filename: string;
  alt: string | null;
  caption: string | null;
  title: string | null;
  description: string | null;
  mime_type: string;
  file_size: number;
  width: number | null;
  height: number | null;
  created_at: string;
  updated_at: string;
};

const EXTERNAL_KEY = "external:";
const SELECT = "id, object_key, filename, alt, caption, title, description, mime_type, file_size, width, height, created_at, updated_at";

export function objectKeyToUrl(objectKey: string) {
  if (objectKey.startsWith(EXTERNAL_KEY)) return objectKey.slice(EXTERNAL_KEY.length);
  return `/api/media-library/file/${objectKey.split("/").map(encodeURIComponent).join("/")}`;
}

function toItem(row: MediaRow) {
  return {
    id: row.id,
    url: objectKeyToUrl(row.object_key),
    filename: row.filename,
    alt: row.alt,
    caption: row.caption,
    title: row.title,
    description: row.description,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    width: row.width,
    height: row.height,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function requireWorkspace(c: Context<ApiEnv>) {
  const session = await workspaceFor(c);
  if (!session) {
    c.status(401);
    return null;
  }
  return session.workspace_id;
}

function sanitizeFilename(name: string) {
  const cleaned = name.trim().replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^\.+/, "").slice(0, 120);
  return cleaned || `file-${Date.now()}`;
}

async function insertLocal(c: Context<ApiEnv>, workspaceId: string, file: File, key: string) {
  await c.env.MEDIA.put(key, file.stream(), {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
    customMetadata: { workspace_id: workspaceId },
  });
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    "INSERT INTO media (id, workspace_id, object_key, filename, mime_type, file_size) VALUES (?, ?, ?, ?, ?, ?)",
  )
    .bind(id, workspaceId, key, sanitizeFilename(file.name), file.type || "application/octet-stream", file.size)
    .run();
  return id;
}

media.get("/", async (c) => {
  const workspaceId = await requireWorkspace(c);
  if (!workspaceId) return c.json({ error: "Unauthorized" }, 401);

  const page = Math.max(1, Number(c.req.query("page") || 1));
  const limit = Math.min(90, Math.max(1, Number(c.req.query("limit") || 30)));
  const search = (c.req.query("search") || "").trim();

  let where = "workspace_id = ?";
  const params: unknown[] = [workspaceId];
  if (search) {
    where += " AND (filename LIKE ? OR alt LIKE ? OR caption LIKE ?)";
    const like = `%${search}%`;
    params.push(like, like, like);
  }

  const pageInfo = await c.env.DB.prepare(`SELECT COUNT(*) AS total FROM media WHERE ${where}`).bind(...params).first<{ total: number }>();
  const total = pageInfo?.total || 0;
  const { results } = await c.env.DB.prepare(
    `SELECT ${SELECT} FROM media WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
  )
    .bind(...params, limit, (page - 1) * limit)
    .all<MediaRow>();

  return c.json({
    data: results.map((row) => toItem(row)),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
});

media.post("/", async (c) => {
  const workspaceId = await requireWorkspace(c);
  if (!workspaceId) return c.json({ error: "Unauthorized" }, 401);

  const body = await c.req.json().catch(() => null) as {
    url?: string; filename?: string; alt?: string; caption?: string; title?: string; description?: string; mimeType?: string;
  } | null;
  const url = body?.url?.trim();
  const filename = sanitizeFilename(body?.filename?.trim() || "");
  if (!url || !/^https?:\/\//.test(url) || !filename) return c.json({ error: "url and filename are required" }, 400);

  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    "INSERT INTO media (id, workspace_id, object_key, filename, alt, caption, title, description, mime_type, file_size) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)",
  )
    .bind(
      id,
      workspaceId,
      `${EXTERNAL_KEY}${url}`,
      filename,
      body?.alt ?? null,
      body?.caption ?? null,
      body?.title ?? null,
      body?.description ?? null,
      body?.mimeType || "application/octet-stream",
    )
    .run();

  const row = await c.env.DB.prepare(`SELECT ${SELECT} FROM media WHERE id = ?`).bind(id).first<MediaRow>();
  return c.json({ data: toItem(row!) }, 201);
});

media.post("/batch", async (c) => {
  const workspaceId = await requireWorkspace(c);
  if (!workspaceId) return c.json({ error: "Unauthorized" }, 401);

  const body = await c.req.json().catch(() => null) as { ids?: string[] } | null;
  const ids = [...new Set(body?.ids || [])].slice(0, 100);
  if (ids.length === 0) return c.json({ data: {} });

  const placeholders = ids.map(() => "?").join(", ");
  const { results } = await c.env.DB.prepare(
    `SELECT ${SELECT} FROM media WHERE workspace_id = ? AND id IN (${placeholders})`,
  )
    .bind(workspaceId, ...ids)
    .all<MediaRow>();

  const data: Record<string, ReturnType<typeof toItem>> = {};
  for (const row of results) data[row.id] = toItem(row);
  return c.json({ data });
});

media.get("/file/*", async (c) => {
  const key = c.req.path.replace(/^\/api\/media-library\/file\//, "");
  const object = await c.env.MEDIA.get(key);
  if (!object) return c.json({ error: "Not found" }, 404);
  const headers = new Headers();
  headers.set("Content-Type", object.httpMetadata?.contentType || "application/octet-stream");
  headers.set("Cache-Control", "public, max-age=86400");
  return new Response(object.body, { headers });
});

media.get("/:id", async (c) => {
  const workspaceId = await requireWorkspace(c);
  if (!workspaceId) return c.json({ error: "Unauthorized" }, 401);
  const row = await c.env.DB.prepare(`SELECT ${SELECT} FROM media WHERE id = ? AND workspace_id = ?`)
    .bind(c.req.param("id"), workspaceId).first<MediaRow>();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ data: toItem(row) });
});

media.patch("/:id", async (c) => {
  const workspaceId = await requireWorkspace(c);
  if (!workspaceId) return c.json({ error: "Unauthorized" }, 401);

  const body = await c.req.json().catch(() => null) as { alt?: string; caption?: string; title?: string; description?: string } | null;
  const result = await c.env.DB.prepare(
    "UPDATE media SET alt = ?, caption = ?, title = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?",
  )
    .bind(body?.alt ?? null, body?.caption ?? null, body?.title ?? null, body?.description ?? null, c.req.param("id"), workspaceId)
    .run();
  if (!result.meta.changes) return c.json({ error: "Not found" }, 404);

  const row = await c.env.DB.prepare(`SELECT ${SELECT} FROM media WHERE id = ?`).bind(c.req.param("id")).first<MediaRow>();
  return c.json({ data: toItem(row!) });
});

media.delete("/:id", async (c) => {
  const workspaceId = await requireWorkspace(c);
  if (!workspaceId) return c.json({ error: "Unauthorized" }, 401);

  const row = await c.env.DB.prepare("SELECT object_key FROM media WHERE id = ? AND workspace_id = ?")
    .bind(c.req.param("id"), workspaceId).first<{ object_key: string }>();
  if (!row) return c.json({ error: "Not found" }, 404);

  await c.env.DB.prepare("DELETE FROM media WHERE id = ? AND workspace_id = ?")
    .bind(c.req.param("id"), workspaceId).run();
  if (!row.object_key.startsWith(EXTERNAL_KEY)) {
    await c.env.MEDIA.delete(row.object_key).catch(() => {});
  }
  return c.json({ data: { deleted: true } });
});

media.post("/upload", async (c) => {
  const workspaceId = await requireWorkspace(c);
  if (!workspaceId) return c.json({ error: "Unauthorized" }, 401);

  const formData = await c.req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return c.json({ error: "A file is required" }, 400);

  const key = `${workspaceId}/${crypto.randomUUID()}/${sanitizeFilename(file.name)}`;
  const id = await insertLocal(c, workspaceId, file, key);
  return c.json({ data: { url: objectKeyToUrl(key), mediaId: id, filename: sanitizeFilename(file.name) } }, 201);
});

media.post("/upload/multiple", async (c) => {
  const workspaceId = await requireWorkspace(c);
  if (!workspaceId) return c.json({ error: "Unauthorized" }, 401);

  const formData = await c.req.formData();
  const files = formData.getAll("images").filter((f): f is File => f instanceof File);
  if (files.length === 0) return c.json({ error: "At least one image is required" }, 400);

  const result: { url: string; mediaId: string; filename: string }[] = [];
  for (const file of files) {
    const key = `${workspaceId}/${crypto.randomUUID()}/${sanitizeFilename(file.name)}`;
    const id = await insertLocal(c, workspaceId, file, key);
    result.push({ url: objectKeyToUrl(key), mediaId: id, filename: sanitizeFilename(file.name) });
  }
  return c.json({ result }, 201);
});

export default media;