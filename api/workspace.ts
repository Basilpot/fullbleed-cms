import type { Context } from "hono";
import { sha256 } from "@/lib/server/auth";
import type { ApiEnv } from "./app";

export async function workspaceFor(c: Context<ApiEnv>) {
  const token = c.req.header("cookie")?.match(/(?:^|;\s*)keybud_session=([^;]+)/)?.[1];
  if (!token) return null;
  return c.env.DB.prepare(
    "SELECT workspace_id FROM sessions JOIN memberships ON memberships.user_id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > CURRENT_TIMESTAMP LIMIT 1",
  )
    .bind(await sha256(token))
    .first<{ workspace_id: string }>();
}