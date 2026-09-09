import type { Context } from "hono";
import { sha256 } from "@/lib/server/auth";
import type { ApiEnv } from "./app";

export async function workspaceFor(c: Context<ApiEnv>) {
  const token = c.req.header("cookie")?.match(/(?:^|;\s*)keybud_session=([^;]+)/)?.[1];
  if (!token) return null;
  return c.env.DB.prepare(
    "SELECT memberships.workspace_id, memberships.user_id, memberships.role FROM sessions JOIN users ON users.id = sessions.user_id JOIN memberships ON memberships.user_id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > CURRENT_TIMESTAMP AND users.disabled_at IS NULL ORDER BY memberships.created_at DESC, memberships.rowid DESC LIMIT 1",
  )
    .bind(await sha256(token))
    .first<{ workspace_id: string; user_id: string; role: "owner" | "editor" }>();
}