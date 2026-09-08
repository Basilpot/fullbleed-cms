import { Hono } from "hono";
import { publicApi } from "@/lib/server/public-api";
import { sha256 } from "@/lib/server/auth";

export type ApiEnv = {
  Bindings: Cloudflare.Env;
};

export const api = new Hono<ApiEnv>().basePath("/api");

api.get("/health", (c) => c.json({ service: "keybud-api", status: "ok", timestamp: new Date().toISOString() }));

api.get("/inquiries", async (c) => {
  const session = await inquiryWorkspace(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const { results } = await c.env.DB.prepare("SELECT id, name, email, phone, subject, message, status, created_at FROM inquiries WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 100").bind(session.workspace_id).all();
  return c.json({ data: results });
});

async function inquiryWorkspace(c: any) {
  const token = c.req.header("cookie")?.match(/(?:^|;\s*)keybud_session=([^;]+)/)?.[1];
  if (!token) return null;
  return c.env.DB.prepare("SELECT workspace_id FROM sessions JOIN memberships ON memberships.user_id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > CURRENT_TIMESTAMP LIMIT 1").bind(await sha256(token)).first<{ workspace_id: string }>();
}

api.patch("/inquiries/:id", async (c) => {
  const session = await inquiryWorkspace(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json().catch(() => null) as { status?: string } | null;
  if (!body?.status || !["new", "read", "archived"].includes(body.status)) return c.json({ error: "Invalid status" }, 400);
  const result = await c.env.DB.prepare("UPDATE inquiries SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?").bind(body.status, c.req.param("id"), session.workspace_id).run();
  return result.meta.changes ? c.json({ data: { updated: true } }) : c.json({ error: "Not found" }, 404);
});

api.delete("/inquiries/:id", async (c) => {
  const session = await inquiryWorkspace(c);
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

api.all("/v1/*", async (c) => {
  const path = c.req.path.replace(/^\/api\/v1\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  return publicApi(c.req.raw, path);
});

api.all("*", (c) => c.json({ error: "Not found" }, 404));

export default api;
