import type { Context } from "hono";
import { sha256 } from "@/lib/server/auth";
import type { ApiEnv } from "./app";

// Pass `slug` to scope to a specific workspace; otherwise falls back to the
// caller's most recent membership (which is where a freshly accepted invite lands).
export async function workspaceFor(c: Context<ApiEnv>, slug?: string) {
  const token = c.req.header("cookie")?.match(/(?:^|;\s*)fullbleed_session=([^;]+)/)?.[1];
  if (!token) return null;
  const scoped = slug?.trim().toLowerCase() || null;
  return c.env.DB.prepare(
    `SELECT memberships.workspace_id, memberships.user_id, memberships.role, users.email
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     JOIN memberships ON memberships.user_id = sessions.user_id
     JOIN workspaces ON workspaces.id = memberships.workspace_id
     WHERE sessions.token_hash = ? AND datetime(sessions.expires_at) > CURRENT_TIMESTAMP
       AND users.disabled_at IS NULL AND (? IS NULL OR workspaces.slug = ?)
     ORDER BY memberships.created_at DESC, memberships.rowid DESC LIMIT 1`,
  )
    .bind(await sha256(token), scoped, scoped)
    .first<{ workspace_id: string; user_id: string; role: "owner" | "editor"; email: string; workspace_slug: string }>();
}
