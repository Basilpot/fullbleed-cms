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

// Nothing under /api is cached — not at the edge, not in the browser. Every
// response reflects the database as of the request; sites consuming the API
// own their caching. Handlers that set their own Cache-Control (media files)
// keep it.
api.use("*", async (c, next) => {
  await next();
  if (!c.res.headers.has("cache-control")) c.res.headers.set("Cache-Control", "no-store");
});

api.get("/health", (c) => c.json({ service: "fullbleed-api", status: "ok", timestamp: new Date().toISOString() }));

api.route("/media-library", media);
api.route("/members", members);
api.route("/admin", platformAdmin);
api.route("/", cms);

api.get("/notices/active", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT id, title, message, variant, link_url, link_label FROM notices
     WHERE active = 1 AND (starts_at IS NULL OR datetime(starts_at) <= CURRENT_TIMESTAMP) AND (ends_at IS NULL OR datetime(ends_at) > CURRENT_TIMESTAMP)
     ORDER BY created_at DESC`,
  ).all();
  return c.json({ data: { notices: results } });
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
