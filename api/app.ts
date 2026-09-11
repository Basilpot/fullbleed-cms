import { Hono } from "hono";
import { publicApi } from "@/lib/server/public-api";
import { sha256 } from "@/lib/server/auth";
import { workspaceFor } from "./workspace";
import { media } from "./media";
import { cms } from "./cms";
import { members } from "./team";
import { platformAdmin } from "./platform";

export type ApiEnv = {
  Bindings: Cloudflare.Env;
};

export const api = new Hono<ApiEnv>().basePath("/api");

api.get("/health", (c) => c.json({ service: "fullbleed-api", status: "ok", timestamp: new Date().toISOString() }));

api.route("/media-library", media);
api.route("/members", members);
api.route("/admin", platformAdmin);
api.route("/", cms);

api.get("/notices/active", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT id, title, message, variant, link_url, link_label FROM notices
     WHERE active = 1 AND (starts_at IS NULL OR starts_at <= CURRENT_TIMESTAMP) AND (ends_at IS NULL OR ends_at > CURRENT_TIMESTAMP)
     ORDER BY created_at DESC`,
  ).all();
  return c.json({ data: { notices: results } });
});

api.get("/inquiries", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const { results } = await c.env.DB.prepare("SELECT id, name, email, phone, subject, message, status, created_at FROM inquiries WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 100").bind(session.workspace_id).all();
  return c.json({ data: results });
});

api.patch("/inquiries/:id", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json().catch(() => null) as { status?: string } | null;
  if (!body?.status || !["new", "read", "archived"].includes(body.status)) return c.json({ error: "Invalid status" }, 400);
  const result = await c.env.DB.prepare("UPDATE inquiries SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?").bind(body.status, c.req.param("id"), session.workspace_id).run();
  return result.meta.changes ? c.json({ data: { updated: true } }) : c.json({ error: "Not found" }, 404);
});

api.delete("/inquiries/:id", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const result = await c.env.DB.prepare("DELETE FROM inquiries WHERE id = ? AND workspace_id = ?").bind(c.req.param("id"), session.workspace_id).run();
  return result.meta.changes ? c.json({ data: { deleted: true } }) : c.json({ error: "Not found" }, 404);
});

api.post("/v1/inquiries", async (c) => {
  const authorization = c.req.header("authorization") ?? "";
  const key = authorization.match(/^Bearer (kb_pub_[A-Za-z0-9_-]+)$/)?.[1];
  if (!key) return c.json({ error: "Invalid API key" }, 401);
  const workspace = await c.env.DB.prepare("SELECT workspace_id FROM api_keys WHERE key_hash = ? AND revoked_at IS NULL").bind(await sha256(key)).first<{ workspace_id: string }>();
  if (!workspace) return c.json({ error: "Invalid API key" }, 401);
  const origin = c.req.header("origin");
  if (origin) {
    const allowed = await c.env.DB.prepare("SELECT 1 FROM allowed_origins WHERE workspace_id = ? AND origin = ?").bind(workspace.workspace_id, origin).first();
    if (!allowed) return c.json({ error: "Origin not allowed" }, 403);
  }
  const body = await c.req.json().catch(() => null) as { name?: string; email?: string; phone?: string; subject?: string; message?: string } | null;
  if (!body?.name?.trim() || !body.email?.includes("@") || !body.message?.trim()) return c.json({ error: "name, email, and message are required" }, 400);
  await c.env.DB.prepare("INSERT INTO inquiries (id, workspace_id, name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), workspace.workspace_id, body.name.trim(), body.email.trim().toLowerCase(), body.phone?.trim() || null, body.subject?.trim() || null, body.message.trim()).run();
  return c.json({ data: { received: true } }, 201);
});

const KEY_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";

function generateApiKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(30));
  let suffix = "";
  for (const byte of bytes) suffix += KEY_ALPHABET[byte % KEY_ALPHABET.length];
  const full = `kb_pub_${suffix}`;
  return { full, prefix: full.slice(0, 14) };
}

api.get("/keys", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const { results } = await c.env.DB.prepare(
    "SELECT id, prefix, created_at, revoked_at FROM api_keys WHERE workspace_id = ? ORDER BY created_at DESC",
  ).bind(session.workspace_id).all();
  return c.json({ data: results });
});

api.post("/keys", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const { full, prefix } = generateApiKey();
  const id = crypto.randomUUID();
  await c.env.DB.prepare("INSERT INTO api_keys (id, workspace_id, prefix, key_hash) VALUES (?, ?, ?, ?)")
    .bind(id, session.workspace_id, prefix, await sha256(full)).run();
  return c.json({ data: { id, prefix, key: full, created_at: new Date().toISOString(), revoked_at: null } }, 201);
});

api.post("/keys/:id/revoke", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const result = await c.env.DB.prepare("UPDATE api_keys SET revoked_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ? AND revoked_at IS NULL")
    .bind(c.req.param("id"), session.workspace_id).run();
  return result.meta.changes ? c.json({ data: { revoked: true } }) : c.json({ error: "Not found" }, 404);
});

api.all("/v1/*", async (c) => {
  const path = c.req.path.replace(/^\/api\/v1\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  return publicApi(c.req.raw, path);
});

api.all("*", (c) => c.json({ error: "Not found" }, 404));

export default api;
