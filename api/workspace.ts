import type { Context } from "hono";
import { sha256 } from "@/lib/server/auth";
import type { ApiEnv } from "./app";

// The workspace a dashboard request is about: `?workspace=<slug>` if given,
// else the `/workspace/<slug>/…` page that issued the fetch (same-origin fetches
// carry the full Referer). Membership is still checked, so a forged value can
// only pick among the caller's own workspaces.
function requestedSlug(c: Context<ApiEnv>) {
  const query = c.req.query("workspace");
  if (query) return query;
  const referer = c.req.header("referer");
  if (!referer) return undefined;
  try {
    const url = new URL(referer);
    if (url.origin !== new URL(c.req.url).origin) return undefined;
    return url.pathname.match(/^\/workspace\/([^/]+)/)?.[1];
  } catch {
    return undefined;
  }
}

// Scopes to `slug`, else to the workspace the request names (see requestedSlug),
// else falls back to the caller's default workspace (owned first, then newest).
export async function workspaceFor(c: Context<ApiEnv>, slug?: string) {
  const token = c.req.header("cookie")?.match(/(?:^|;\s*)fullbleed_session=([^;]+)/)?.[1];
  if (!token) return null;
  const scoped = (slug ?? requestedSlug(c))?.trim().toLowerCase() || null;
  return c.env.DB.prepare(
    `SELECT memberships.workspace_id, memberships.user_id, memberships.role, users.email
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     JOIN memberships ON memberships.user_id = sessions.user_id
     JOIN workspaces ON workspaces.id = memberships.workspace_id
     WHERE sessions.token_hash = ? AND datetime(sessions.expires_at) > CURRENT_TIMESTAMP
       AND users.disabled_at IS NULL AND (? IS NULL OR workspaces.slug = ?)
     ORDER BY memberships.role = 'owner' DESC, memberships.created_at DESC, memberships.rowid DESC LIMIT 1`,
  )
    .bind(await sha256(token), scoped, scoped)
    .first<{ workspace_id: string; user_id: string; role: "owner" | "editor"; email: string; workspace_slug: string }>();
}
