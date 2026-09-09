import { Hono, type Context } from "hono";
import { workspaceFor } from "./workspace";
import { hashPassword, verifyPassword } from "@/lib/server/auth";
import { objectKeyToUrl } from "./media";
import type { ApiEnv } from "./app";

export const cms = new Hono<ApiEnv>();

type Session = { workspace_id: string; user_id: string; role: "owner" | "editor" };

function pagination(url: URL) {
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get("limit") ?? "10", 10) || 10));
  return { page, limit, offset: (page - 1) * limit };
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100) || "item";
}

/* -------------------------------- Authors ------------------------------- */

cms.get("/authors", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const { page, limit, offset } = pagination(new URL(c.req.url));
  const [list, count] = await c.env.DB.batch([
    c.env.DB.prepare("SELECT id, name, slug, email, bio, image_url, created_at, updated_at FROM authors WHERE workspace_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?")
      .bind(session.workspace_id, limit, offset),
    c.env.DB.prepare("SELECT COUNT(*) AS total FROM authors WHERE workspace_id = ?").bind(session.workspace_id),
  ]);
  const rows = list.results as { id: string; name: string; slug: string; email: string | null; bio: string | null; image_url: string | null }[];
  return c.json({
    data: rows.map((row) => ({
      id: row.id,
      name: row.name,
      username: row.slug,
      email: row.email ?? "",
      bio: row.bio ?? "",
      image: row.image_url ?? "",
    })),
    pagination: { page, limit, total: Number((count.results[0] as { total: number }).total), totalPages: Math.max(1, Math.ceil(Number((count.results[0] as { total: number }).total) / limit)) },
  });
});

cms.get("/authors/:username", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const row = await c.env.DB.prepare("SELECT id, name, slug, email, bio, image_url FROM authors WHERE workspace_id = ? AND slug = ?")
    .bind(session.workspace_id, c.req.param("username")).first();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ id: row.id, name: row.name, username: row.slug, email: row.email, bio: row.bio ?? "", image: row.image_url ?? "" });
});

cms.post("/authors/create", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json().catch(() => null) as { username?: string; name?: string; email?: string; bio?: string; image?: string } | null;
  const slug = slugify(body?.username ?? "");
  if (!body?.name?.trim() || !slug || !body?.email?.trim()) return c.json({ message: "name, username, and email are required" }, 400);
  try {
    await c.env.DB.prepare("INSERT INTO authors (id, workspace_id, name, slug, email, bio, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(crypto.randomUUID(), session.workspace_id, body.name.trim(), slug, body.email.trim().toLowerCase(), body.bio ?? null, body.image || null).run();
  } catch {
    return c.json({ message: "Username or email already in use" }, 409);
  }
  return c.json({ data: { created: true } }, 201);
});

cms.patch("/authors/update/:username", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json().catch(() => null) as { username?: string; name?: string; email?: string; bio?: string; image?: string } | null;
  const slug = slugify(body?.username ?? "");
  if (!body?.name?.trim() || !slug || !body?.email?.trim()) return c.json({ message: "name, username, and email are required" }, 400);
  try {
    const result = await c.env.DB.prepare("UPDATE authors SET name = ?, slug = ?, email = ?, bio = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE workspace_id = ? AND slug = ?")
      .bind(body.name.trim(), slug, body.email.trim().toLowerCase(), body.bio ?? null, body.image || null, session.workspace_id, c.req.param("username")).run();
    if (!result.meta.changes) return c.json({ message: "Author not found" }, 404);
  } catch {
    return c.json({ message: "Username or email already in use" }, 409);
  }
  return c.json({ data: { updated: true } });
});

cms.delete("/authors/delete/:id", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const result = await c.env.DB.prepare("DELETE FROM authors WHERE id = ? AND workspace_id = ?")
    .bind(c.req.param("id"), session.workspace_id).run();
  if (!result.meta.changes) return c.json({ message: "Author not found" }, 404);
  return c.json({ data: { deleted: true } });
});

/* ------------------------------- Redirects ------------------------------ */

cms.get("/redirects", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const { results } = await c.env.DB.prepare("SELECT id, source_path, target_path, permanent FROM redirects WHERE workspace_id = ? ORDER BY created_at DESC").bind(session.workspace_id).all();
  return c.json({ data: results.map((row) => ({ id: row.id, from: row.source_path, to: row.target_path, permanent: row.permanent === 1 })) });
});

cms.put("/redirects", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json().catch(() => null) as { from?: string; to?: string; permanent?: boolean } | null;
  if (!body?.from?.trim() || !body.to?.trim()) return c.json({ message: "from and to are required" }, 400);
  if (!body.from.startsWith("/")) return c.json({ message: "from must start with /" }, 400);
  const existing = await c.env.DB.prepare("SELECT id FROM redirects WHERE workspace_id = ? AND source_path = ?").bind(session.workspace_id, body.from.trim()).first<{ id: string }>();
  if (existing) {
    await c.env.DB.prepare("UPDATE redirects SET target_path = ?, permanent = ? WHERE id = ?").bind(body.to.trim(), body.permanent ? 1 : 0, existing.id).run();
  } else {
    await c.env.DB.prepare("INSERT INTO redirects (id, workspace_id, source_path, target_path, permanent) VALUES (?, ?, ?, ?, ?)")
      .bind(crypto.randomUUID(), session.workspace_id, body.from.trim(), body.to.trim(), body.permanent ? 1 : 0).run();
  }
  return c.json({ message: "Redirect saved" });
});

cms.delete("/redirects/:id", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const result = await c.env.DB.prepare("DELETE FROM redirects WHERE id = ? AND workspace_id = ?").bind(c.req.param("id"), session.workspace_id).run();
  if (!result.meta.changes) return c.json({ message: "Redirect not found" }, 404);
  return c.json({ message: "Redirect deleted" });
});

/* --------------------------------- Tags --------------------------------- */

cms.get("/tags", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const { page, limit, offset } = pagination(new URL(c.req.url));
  const [list, count] = await c.env.DB.batch([
    c.env.DB.prepare("SELECT id, name, slug, description, created_at FROM tags WHERE workspace_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?").bind(session.workspace_id, limit, offset),
    c.env.DB.prepare("SELECT COUNT(*) AS total FROM tags WHERE workspace_id = ?").bind(session.workspace_id),
  ]);
  const rows = list.results as { id: string; name: string; slug: string; description: string | null; created_at: string }[];
  const total = Number((count.results[0] as { total: number }).total);
  return c.json({
    data: {
      tags: rows.map((row) => ({ id: row.id, name: row.name, slug: row.slug, description: row.description ?? "", createdAt: row.created_at, _count: { products: 0 } })),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    },
  });
});

cms.post("/tags", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json().catch(() => null) as { name?: string; slug?: string; description?: string } | null;
  const slug = slugify(body?.slug ?? body?.name ?? "");
  if (!body?.name?.trim() || !slug) return c.json({ message: "name is required" }, 400);
  try {
    await c.env.DB.prepare("INSERT INTO tags (id, workspace_id, name, slug, description) VALUES (?, ?, ?, ?, ?)")
      .bind(crypto.randomUUID(), session.workspace_id, body.name.trim(), slug, body.description ?? null).run();
  } catch {
    return c.json({ message: "Tag slug already in use" }, 409);
  }
  return c.json({ data: { created: true } }, 201);
});

cms.patch("/tags/:id", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json().catch(() => null) as { name?: string; slug?: string; description?: string } | null;
  const slug = slugify(body?.slug ?? "");
  if (!body?.name?.trim() || !slug) return c.json({ message: "name is required" }, 400);
  const result = await c.env.DB.prepare("UPDATE tags SET name = ?, slug = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE workspace_id = ? AND slug = ?")
    .bind(body.name.trim(), slug, body.description ?? null, session.workspace_id, c.req.param("id")).run();
  if (!result.meta.changes) {
    const byId = await c.env.DB.prepare("UPDATE tags SET name = ?, slug = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE workspace_id = ? AND id = ?")
      .bind(body.name.trim(), slug, body.description ?? null, session.workspace_id, c.req.param("id")).run();
    if (!byId.meta.changes) return c.json({ message: "Tag not found" }, 404);
  }
  return c.json({ data: { updated: true } });
});

cms.delete("/tags/:id", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  await c.env.DB.prepare("DELETE FROM content_tags WHERE tag_id = ?").bind(c.req.param("id")).run();
  const result = await c.env.DB.prepare("DELETE FROM tags WHERE id = ? AND workspace_id = ?").bind(c.req.param("id"), session.workspace_id).run();
  if (!result.meta.changes) return c.json({ message: "Tag not found" }, 404);
  return c.json({ message: "Tag deleted" });
});

/* ------------------------------ Categories ------------------------------ */

function categoryRow(row: Record<string, unknown>, infoPages: number, blogs: number) {
  return {
    id: row.id,
    categoryName: row.name,
    categoryHandle: row.slug,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    _count: { infoPages, blogs },
  };
}

cms.get("/info-page/categories", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const url = new URL(c.req.url);
  const { page, limit, offset } = pagination(url);
  const [list, count] = await c.env.DB.batch([
    c.env.DB.prepare("SELECT c.id, c.name, c.slug, c.created_at, c.updated_at, SUM(CASE WHEN co.kind = 'page' THEN 1 ELSE 0 END) AS info_pages, SUM(CASE WHEN co.kind = 'post' THEN 1 ELSE 0 END) AS blogs FROM categories c LEFT JOIN content co ON co.category_id = c.id LEFT JOIN media m ON m.id = co.cover_media_id WHERE c.workspace_id = ? GROUP BY c.id ORDER BY c.created_at DESC LIMIT ? OFFSET ?").bind(session.workspace_id, limit, offset),
    c.env.DB.prepare("SELECT COUNT(*) AS total FROM categories WHERE workspace_id = ?").bind(session.workspace_id),
  ]);
  const rows = list.results as Record<string, unknown>[];
  const total = Number((count.results[0] as { total: number }).total);
  return c.json({
    data: {
      categories: rows.map((row) => categoryRow(row, Number(row.info_pages ?? 0), Number(row.blogs ?? 0))),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    },
  });
});

cms.post("/info-page/categories", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json().catch(() => null) as { categoryName?: string; categoryHandle?: string } | null;
  const slug = slugify(body?.categoryHandle ?? body?.categoryName ?? "");
  if (!body?.categoryName?.trim() || !slug) return c.json({ message: "categoryName is required" }, 400);
  try {
    await c.env.DB.prepare("INSERT INTO categories (id, workspace_id, name, slug) VALUES (?, ?, ?, ?)")
      .bind(crypto.randomUUID(), session.workspace_id, body.categoryName.trim(), slug).run();
  } catch {
    return c.json({ message: "Category handle already in use" }, 409);
  }
  return c.json({ data: { created: true } }, 201);
});

cms.put("/info-page/categories/:id", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json().catch(() => null) as { categoryName?: string; categoryHandle?: string } | null;
  const slug = slugify(body?.categoryHandle ?? "");
  if (!body?.categoryName?.trim() || !slug) return c.json({ message: "categoryName is required" }, 400);
  const result = await c.env.DB.prepare("UPDATE categories SET name = ?, slug = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?")
    .bind(body.categoryName.trim(), slug, c.req.param("id"), session.workspace_id).run();
  if (!result.meta.changes) return c.json({ message: "Category not found" }, 404);
  return c.json({ data: { updated: true } });
});

cms.delete("/info-page/categories/:id", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const result = await c.env.DB.prepare("DELETE FROM categories WHERE id = ? AND workspace_id = ?").bind(c.req.param("id"), session.workspace_id).run();
  if (!result.meta.changes) return c.json({ message: "Category not found" }, 404);
  return c.json({ message: "Category deleted" });
});

/* ------------------------------ Info pages ------------------------------ */

function contentSelect() {
  return `SELECT content.id, content.title, content.slug, content.body_html, content.status, content.published_at, content.meta_title, content.meta_description, content.cover_media_id, content.author_id, content.category_id, content.created_at, content.updated_at, content.deleted_at,
    media.object_key AS cover_key, authors.name AS author_name, authors.slug AS author_slug, authors.email AS author_email,
    categories.name AS category_name, categories.slug AS category_slug
    FROM content
    LEFT JOIN media ON media.id = content.cover_media_id
    LEFT JOIN authors ON authors.id = content.author_id
    LEFT JOIN categories ON categories.id = content.category_id
    WHERE content.workspace_id = ? AND content.kind = ?`;
}

function serializeInfoPage(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    content: row.body_html,
    coverImage: row.cover_key ? objectKeyToUrl(row.cover_key as string) : "",
    metaTitle: row.meta_title ?? "",
    metaDescription: row.meta_description ?? "",
    published: row.status === "published",
    publishedAt: row.published_at ?? null,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
    infoPageCategoryId: row.category_id ?? null,
    infoPageCategory: row.category_id ? { id: row.category_id, categoryName: row.category_name, categoryHandle: row.category_slug } : null,
  };
}

cms.get("/info-page", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const url = new URL(c.req.url);
  const { page, limit, offset } = pagination(url);
  const conditions = []; const values: unknown[] = [];
  const published = url.searchParams.get("published");
  if (published === "true") { conditions.push("content.status = 'published'"); }
  else if (published === "false") { conditions.push("content.status = 'draft'"); }
  const categoryId = url.searchParams.get("categoryId");
  if (categoryId) { conditions.push("content.category_id = ?"); values.push(categoryId); }
  const search = url.searchParams.get("search");
  if (search) { conditions.push("content.title LIKE ?"); values.push(`%${search}%`); }
  conditions.push("content.deleted_at IS NULL");
  const where = ` AND ${conditions.join(" AND ")}`;
  const [list, count] = await c.env.DB.batch([
    c.env.DB.prepare(`${contentSelect()}${where} ORDER BY content.created_at DESC LIMIT ? OFFSET ?`).bind(session.workspace_id, "page", ...values, limit, offset),
    c.env.DB.prepare(`SELECT COUNT(*) AS total FROM content WHERE workspace_id = ? AND kind = 'page'${where}`).bind(session.workspace_id, ...values),
  ]);
  const rows = list.results as Record<string, unknown>[];
  const total = Number((count.results[0] as { total: number }).total);
  return c.json({ data: { infoPages: rows.map(serializeInfoPage), pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } } });
});

cms.get("/info-page/:id", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const row = await c.env.DB.prepare(`${contentSelect()} AND content.id = ?`).bind(session.workspace_id, "page", c.req.param("id")).first();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ data: { infoPage: serializeInfoPage(row as Record<string, unknown>) } });
});

async function saveInfoPage(c: Context<ApiEnv>, session: Session, id?: string) {
  const body = await c.req.json().catch(() => null) as { title?: string; slug?: string; content?: string; coverImage?: string; metaTitle?: string; metaDescription?: string; published?: boolean; infoPageCategoryId?: string | null } | null;
  const slug = slugify(body?.slug ?? "");
  if (!body?.title?.trim() || !slug) return c.json({ message: "title is required" }, 400);
  const coverMediaId = await mediaIdFromUrl(c, session.workspace_id, body.coverImage);
  const status = body.published ? "published" : "draft";
  const publishedAt = body.published ? (new Date().toISOString()) : null;
  if (id) {
    const result = await c.env.DB.prepare("UPDATE content SET title = ?, slug = ?, body_html = ?, cover_media_id = ?, meta_title = ?, meta_description = ?, status = ?, published_at = ?, category_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ? AND kind = 'page'")
      .bind(body.title.trim(), slug, body.content ?? "", coverMediaId, body.metaTitle ?? null, body.metaDescription ?? null, status, publishedAt, body.infoPageCategoryId || null, id, session.workspace_id).run();
    if (!result.meta.changes) return c.json({ message: "Info page not found" }, 404);
  } else {
    await c.env.DB.prepare("INSERT INTO content (id, workspace_id, kind, title, slug, body_html, cover_media_id, meta_title, meta_description, status, published_at, category_id) VALUES (?, ?, 'page', ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(crypto.randomUUID(), session.workspace_id, body.title.trim(), slug, body.content ?? "", coverMediaId, body.metaTitle ?? null, body.metaDescription ?? null, status, publishedAt, body.infoPageCategoryId || null).run();
  }
  return c.json({ data: { saved: true } }, id ? 200 : 201);
}

cms.post("/info-page", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  return saveInfoPage(c, session);
});
cms.post("/info-page/", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  return saveInfoPage(c, session);
});
cms.put("/info-page/:id", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  return saveInfoPage(c, session, c.req.param("id"));
});

cms.delete("/info-page/:id", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const result = await c.env.DB.prepare("DELETE FROM content WHERE id = ? AND workspace_id = ? AND kind = 'page'").bind(c.req.param("id"), session.workspace_id).run();
  if (!result.meta.changes) return c.json({ message: "Info page not found" }, 404);
  return c.json({ message: "Info page deleted" });
});

/* --------------------------------- Blogs -------------------------------- */

function serializeBlog(row: Record<string, unknown>, tags: string[]) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    content: row.body_html,
    coverImage: row.cover_key ? objectKeyToUrl(row.cover_key as string) : "",
    metaTitle: row.meta_title ?? "",
    metaDescription: row.meta_description ?? "",
    tags: tags.join(", "),
    published: row.status === "published",
    publishedAt: row.published_at ?? null,
    category: row.category_id ? { id: row.category_id, categoryName: row.category_name, categoryHandle: row.category_slug } : null,
    writer: row.author_id ? { name: row.author_name, username: row.author_slug } : null,
    author: row.author_id ? { id: row.author_id, name: row.author_name, email: row.author_email } : null,
    authorId: row.author_id ?? null,
    inTrash: row.deleted_at !== null,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  };
}

async function tagsFor(c: Context<ApiEnv>, contentIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (!contentIds.length) return map;
  const placeholders = contentIds.map(() => "?").join(", ");
  const { results } = await c.env.DB.prepare(`SELECT ct.content_id, t.name FROM content_tags ct JOIN tags t ON t.id = ct.tag_id WHERE ct.content_id IN (${placeholders}) ORDER BY t.name`).bind(...contentIds).all<{ content_id: string; name: string }>();
  for (const tag of results) {
    const list = map.get(tag.content_id) ?? [];
    list.push(tag.name);
    map.set(tag.content_id, list);
  }
  return map;
}

async function listBlogs(c: Context<ApiEnv>, session: Session, url: URL) {
  const { page, limit, offset } = pagination(url);
  const conditions: string[] = ["content.kind = 'post'"];
  const values: unknown[] = [];
  if (url.searchParams.get("trash") === "true") conditions.push("content.deleted_at IS NOT NULL");
  else conditions.push("content.deleted_at IS NULL");
  const category = url.searchParams.get("category");
  if (category) { conditions.push("categories.slug = ?"); values.push(category); }
  const where = conditions.join(" AND ");
  const [list, count] = await c.env.DB.batch([
    c.env.DB.prepare(`${contentSelect()} AND ${where} ORDER BY content.created_at DESC LIMIT ? OFFSET ?`).bind(session.workspace_id, "post", ...values, limit, offset),
    c.env.DB.prepare(`SELECT COUNT(*) AS total FROM content LEFT JOIN categories ON categories.id = content.category_id WHERE content.workspace_id = ? AND ${where}`).bind(session.workspace_id, ...values),
  ]);
  const rows = list.results as Record<string, unknown>[];
  const tags = await tagsFor(c, rows.map((row) => row.id as string));
  const total = Number((count.results[0] as { total: number }).total);
  return { data: { data: rows.map((row) => serializeBlog(row, tags.get(row.id as string) ?? [])), pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } } };
}

cms.get("/blogs", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  return c.json(await listBlogs(c, session, new URL(c.req.url)));
});

cms.get("/blogs/category/:category", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const url = new URL(c.req.url);
  url.searchParams.set("category", c.req.param("category"));
  return c.json(await listBlogs(c, session, url));
});

cms.get("/blogs/:slug", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const row = await c.env.DB.prepare(`${contentSelect()} AND content.slug = ? AND content.deleted_at IS NULL`).bind(session.workspace_id, "post", c.req.param("slug")).first();
  if (!row) return c.json({ error: "Not found" }, 404);
  const tags = await tagsFor(c, [row.id as string]);
  return c.json(serializeBlog(row as Record<string, unknown>, tags.get(row.id as string) ?? []));
});

async function saveBlog(c: Context<ApiEnv>, session: Session, slug?: string) {
  const body = await c.req.json().catch(() => null) as { title?: string; slug?: string; content?: string; coverImage?: string; category?: string | null; metaTitle?: string; metaDescription?: string; tags?: string; published?: boolean; publishedAt?: string } | null;
  const newSlug = slugify(body?.slug ?? "");
  if (!body?.title?.trim() || !newSlug) return c.json({ message: "title is required" }, 400);
  const coverMediaId = await mediaIdFromUrl(c, session.workspace_id, body.coverImage);
  const status = body.published ? "published" : "draft";
  const publishedAt = body.publishedAt && body.published ? body.publishedAt : (body.published ? new Date().toISOString() : null);
  let id: string;
  if (slug) {
    const row = await c.env.DB.prepare("SELECT id FROM content WHERE workspace_id = ? AND kind = 'post' AND slug = ?").bind(session.workspace_id, slug).first<{ id: string }>();
    if (!row) return c.json({ message: "Blog not found" }, 404);
    id = row.id;
    await c.env.DB.prepare("UPDATE content SET title = ?, slug = ?, body_html = ?, cover_media_id = ?, category_id = ?, meta_title = ?, meta_description = ?, status = ?, published_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(body.title.trim(), newSlug, body.content ?? "", coverMediaId, body.category || null, body.metaTitle ?? null, body.metaDescription ?? null, status, publishedAt, id).run();
  } else {
    id = crypto.randomUUID();
    await c.env.DB.prepare("INSERT INTO content (id, workspace_id, kind, title, slug, body_html, cover_media_id, category_id, meta_title, meta_description, status, published_at) VALUES (?, ?, 'post', ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, session.workspace_id, body.title.trim(), newSlug, body.content ?? "", coverMediaId, body.category || null, body.metaTitle ?? null, body.metaDescription ?? null, status, publishedAt).run();
  }
  await replaceContentTags(c, id, body.tags);
  return c.json({ data: { saved: true } }, slug ? 200 : 201);
}

async function replaceContentTags(c: Context<ApiEnv>, contentId: string, tags?: string) {
  await c.env.DB.prepare("DELETE FROM content_tags WHERE content_id = ?").bind(contentId).run();
  const names = (tags ?? "").split(",").map((tag) => tag.trim()).filter(Boolean);
  if (!names.length) return;
  const session = await c.env.DB.prepare("SELECT workspace_id FROM content WHERE id = ?").bind(contentId).first<{ workspace_id: string }>();
  for (const name of names) {
    const slug = slugify(name);
    let row = await c.env.DB.prepare("SELECT id FROM tags WHERE workspace_id = ? AND slug = ?").bind(session?.workspace_id ?? "", slug).first<{ id: string }>();
    if (!row) {
      row = { id: crypto.randomUUID() };
      await c.env.DB.prepare("INSERT INTO tags (id, workspace_id, name, slug) VALUES (?, ?, ?, ?)").bind(row.id, session?.workspace_id ?? "", name, slug).run();
    }
    await c.env.DB.prepare("INSERT OR IGNORE INTO content_tags (content_id, tag_id) VALUES (?, ?)").bind(contentId, row.id).run();
  }
}

cms.post("/blogs", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  return saveBlog(c, session);
});
cms.post("/blogs/", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  return saveBlog(c, session);
});
cms.patch("/blogs/update/:slug", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  return saveBlog(c, session, c.req.param("slug"));
});

cms.delete("/blogs/:id", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const url = new URL(c.req.url);
  const id = c.req.param("id");
  if (url.searchParams.get("permanent") === "true") {
    await c.env.DB.prepare("DELETE FROM content_tags WHERE content_id = ?").bind(id).run();
    const result = await c.env.DB.prepare("DELETE FROM content WHERE id = ? AND workspace_id = ? AND kind = 'post'").bind(id, session.workspace_id).run();
    if (!result.meta.changes) return c.json({ message: "Blog not found" }, 404);
  } else {
    const result = await c.env.DB.prepare("UPDATE content SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ? AND kind = 'post'").bind(id, session.workspace_id).run();
    if (!result.meta.changes) return c.json({ message: "Blog not found" }, 404);
  }
  return c.json({ message: "Blog deleted" });
});

cms.patch("/blogs/restore/:id", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const result = await c.env.DB.prepare("UPDATE content SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ? AND kind = 'post'").bind(c.req.param("id"), session.workspace_id).run();
  if (!result.meta.changes) return c.json({ message: "Blog not found" }, 404);
  return c.json({ message: "Blog restored" });
});

/* ------------------------------ Media batch ----------------------------- */

cms.post("/media/batch", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json().catch(() => null) as { ids?: string[] } | null;
  const ids = (body?.ids ?? []).slice(0, 100);
  if (!ids.length) return c.json({ data: {} });
  const placeholders = ids.map(() => "?").join(", ");
  const { results } = await c.env.DB.prepare(`SELECT id, alt, title, caption FROM media WHERE workspace_id = ? AND id IN (${placeholders})`).bind(session.workspace_id, ...ids).all<{ id: string; alt: string | null; title: string | null; caption: string | null }>();
  return c.json({ data: Object.fromEntries(results.map((row) => [row.id, { alt: row.alt, title: row.title, caption: row.caption }])) });
});

/* ------------------------------ Site config ----------------------------- */

cms.get("/site-config", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const row = await c.env.DB.prepare("SELECT config_json FROM site_config WHERE workspace_id = ?").bind(session.workspace_id).first<{ config_json: string }>();
  return c.json({ config: row ? JSON.parse(row.config_json) : {} });
});

cms.post("/site-config", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== "object") return c.json({ message: "Invalid config" }, 400);
  await c.env.DB.prepare("INSERT INTO site_config (workspace_id, config_json, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT (workspace_id) DO UPDATE SET config_json = excluded.config_json, updated_at = CURRENT_TIMESTAMP")
    .bind(session.workspace_id, JSON.stringify(body)).run();
  return c.json({ data: { saved: true } });
});

/* --------------------------------- Admin -------------------------------- */

cms.get("/admin/me", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const user = await c.env.DB.prepare("SELECT name, email FROM users WHERE id = ?").bind(session.user_id).first<{ name: string; email: string }>();
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  return c.json({ data: { admin: { username: user.name, email: user.email, role: session.role } } });
});

cms.patch("/admin/me", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json().catch(() => null) as { username?: string; email?: string; currentPassword?: string; newPassword?: string } | null;
  if (!body?.username?.trim() || !body.email?.trim()) return c.json({ message: "username and email are required" }, 400);
  const user = await c.env.DB.prepare("SELECT password_hash FROM users WHERE id = ?").bind(session.user_id).first<{ password_hash: string | null }>();
  if (body.newPassword) {
    if (!body.currentPassword) return c.json({ message: "Current password is required" }, 400);
    const valid = user?.password_hash ? await verifyPassword(body.currentPassword, user.password_hash) : false;
    if (!valid) return c.json({ message: "Current password is incorrect" }, 400);
  }
  try {
    await c.env.DB.prepare("UPDATE users SET name = ?, email = ?, password_hash = COALESCE(?, password_hash), updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(body.username.trim(), body.email.trim().toLowerCase(), body.newPassword ? await hashPassword(body.newPassword) : null, session.user_id).run();
  } catch {
    return c.json({ message: "Email already in use" }, 409);
  }
  return c.json({ data: { updated: true } });
});

cms.get("/admin/analytics", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const row = await c.env.DB.prepare("SELECT COUNT(*) AS total, SUM(status = 'published') AS published, SUM(status = 'draft') AS draft FROM content WHERE workspace_id = ?").bind(session.workspace_id).first<{ total: number; published: number; draft: number }>();
  return c.json({
    data: {
      totalProducts: Number(row?.total ?? 0),
      publishedProducts: Number(row?.published ?? 0),
      draftProducts: Number(row?.draft ?? 0),
      totalOrders: 0,
      pendingOrders: 0,
      confirmedOrders: 0,
      completedOrders: 0,
      failedOrders: 0,
      cancelledOrders: 0,
      totalRevenue: 0,
    },
  });
});

/* ------------------------------ Shared ------------------------------ */

async function mediaIdFromUrl(c: Context<ApiEnv>, workspaceId: string, url?: string) {
  if (!url) return null;
  const key = url.replace(/^\/api\/media-library\/file\//, "");
  const row = await c.env.DB.prepare("SELECT id FROM media WHERE workspace_id = ? AND object_key = ?").bind(workspaceId, key).first<{ id: string }>();
  if (row) return row.id;
  const external = await c.env.DB.prepare("SELECT id FROM media WHERE workspace_id = ? AND object_key = ?").bind(workspaceId, `external:${url}`).first<{ id: string }>();
  return external?.id ?? null;
}