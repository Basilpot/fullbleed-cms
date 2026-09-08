import { Hono } from "hono";
import { publicApi } from "@/lib/server/public-api";

export type ApiEnv = {
  Bindings: Cloudflare.Env;
};

export const api = new Hono<ApiEnv>().basePath("/api");

api.get("/health", (c) => c.json({ service: "keybud-api", status: "ok", timestamp: new Date().toISOString() }));

api.all("/v1/*", async (c) => {
  const path = c.req.path.replace(/^\/api\/v1\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  return publicApi(c.req.raw, path);
});

api.all("*", (c) => c.json({ error: "Not found" }, 404));

export default api;
