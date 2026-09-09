import { Hono } from "hono";
import type { Context } from "hono";
import { sessionFor } from "@/lib/server/auth";
import type { ApiEnv } from "./app";

export const platformAdmin = new Hono<ApiEnv>();

async function requirePlatformAdmin(c: Context<ApiEnv>) {
  const token = c.req.header("cookie")?.match(/(?:^|;\s*)keybud_session=([^;]+)/)?.[1];
  if (!token) return null;
  const session = await sessionFor(token);
  if (!session?.is_platform_admin) return null;
  return session;
}

// List users with their memberships
platformAdmin.get("/users", async (c) => {
  const admin = await requirePlatformAdmin(c);
  if (!admin) return c.json({ error: "Platform admins only" }, 403);

  const query = c.req.query("q")?.trim().toLowerCase();
  const limit = Math.min(Number(c.req.query("limit") ?? "50") || 50, 200);

  let rows: { id: string; name: string; email: string; is_platform_admin: number; disabled_at: string | null; created_at: string }[];
  if (query) {
    ({ results: rows } = await c.env.DB.prepare(
      "SELECT id, name, email, is_platform_admin, disabled_at, created_at FROM users WHERE email LIKE ? OR name LIKE ? ORDER BY created_at DESC LIMIT ?",
    ).bind(`%${query}%`, `%${query}%`, limit).all<{ id: string; name: string; email: string; is_platform_admin: number; disabled_at: string | null; created_at: string }>());
  } else {
    ({ results: rows } = await c.env.DB.prepare(
      "SELECT id, name, email, is_platform_admin, disabled_at, created_at FROM users ORDER BY created_at DESC LIMIT ?",
    ).bind(limit).all<{ id: string; name: string; email: string; is_platform_admin: number; disabled_at: string | null; created_at: string }>());
  }

  const userIds = rows.map((row) => row.id);
  let memberships: { user_id: string; role: string; workspace_name: string; workspace_slug: string }[] = [];
  if (userIds.length) {
    const placeholders = userIds.map(() => "?").join(", ");
    ({ results: memberships } = await c.env.DB.prepare(
      `SELECT memberships.user_id, memberships.role, workspaces.name AS workspace_name, workspaces.slug AS workspace_slug
       FROM memberships JOIN workspaces ON workspaces.id = memberships.workspace_id
       WHERE memberships.user_id IN (${placeholders}) ORDER BY memberships.created_at`,
    ).bind(...userIds).all<{ user_id: string; role: string; workspace_name: string; workspace_slug: string }>());
  }

  return c.json({
    data: {
      users: rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        isPlatformAdmin: row.is_platform_admin === 1,
        suspended: row.disabled_at !== null,
        createdAt: row.created_at,
        memberships: memberships.filter((m) => m.user_id === row.id).map((m) => ({ role: m.role, workspaceName: m.workspace_name, workspaceSlug: m.workspace_slug })),
      })),
    },
  });
});

// Grant/revoke platform admin role
platformAdmin.patch("/users/:id", async (c) => {
  const admin = await requirePlatformAdmin(c);
  if (!admin) return c.json({ error: "Platform admins only" }, 403);

  const userId = c.req.param("id");
  if (userId === admin.id) return c.json({ error: "You cannot change your own role" }, 400);
  const body = await c.req.json().catch(() => null) as { isPlatformAdmin?: boolean } | null;
  if (typeof body?.isPlatformAdmin !== "boolean") return c.json({ error: "isPlatformAdmin must be a boolean" }, 400);

  await c.env.DB.prepare("UPDATE users SET is_platform_admin = ? WHERE id = ?").bind(body.isPlatformAdmin ? 1 : 0, userId).run();
  return c.json({ data: { ok: true } });
});

// Suspend / unsuspend a user (login blocked while suspended)
platformAdmin.patch("/users/:id/status", async (c) => {
  const admin = await requirePlatformAdmin(c);
  if (!admin) return c.json({ error: "Platform admins only" }, 403);

  const userId = c.req.param("id");
  if (userId === admin.id) return c.json({ error: "You cannot suspend yourself" }, 400);
  const body = await c.req.json().catch(() => null) as { suspended?: boolean } | null;
  if (typeof body?.suspended !== "boolean") return c.json({ error: "suspended must be a boolean" }, 400);

  await c.env.DB.prepare("UPDATE users SET disabled_at = ? WHERE id = ?").bind(body.suspended ? new Date().toISOString() : null, userId).run();
  return c.json({ data: { ok: true } });
});