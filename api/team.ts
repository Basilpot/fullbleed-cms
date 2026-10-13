import { Hono } from "hono";
import type { Context } from "hono";
import { hashPassword } from "@/lib/server/auth";
import { workspaceFor } from "./workspace";
import type { ApiEnv } from "./app";

export const members = new Hono<ApiEnv>();

const DEFAULT_MEMBER_LIMIT = 5;

async function memberLimit(c: Context<ApiEnv>, workspaceId: string) {
  const row = await c.env.DB.prepare("SELECT member_limit FROM workspaces WHERE id = ?").bind(workspaceId).first<{ member_limit: number }>();
  return row?.member_limit ?? DEFAULT_MEMBER_LIMIT;
}

async function memberCount(c: Context<ApiEnv>, workspaceId: string) {
  const { results } = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM memberships WHERE workspace_id = ?").bind(workspaceId).all<{ n: number }>();
  return results[0]?.n ?? 0;
}

// List members
members.get("/", async (c) => {
  const session = await workspaceFor(c, c.req.query("workspace"));
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const memberRows = await c.env.DB.prepare(
    `SELECT users.id, users.name, users.email, users.image_url, users.created_at, memberships.role
     FROM memberships JOIN users ON users.id = memberships.user_id
     WHERE memberships.workspace_id = ? ORDER BY memberships.role = 'owner' DESC, users.name`,
  ).bind(session.workspace_id).all<{ id: string; name: string; email: string; image_url: string | null; created_at: string; role: "owner" | "editor" }>();

  return c.json({
    data: {
      members: memberRows.results.map((m) => ({ id: m.id, name: m.name, email: m.email, imageUrl: m.image_url, role: m.role, createdAt: m.created_at })),
    },
  });
});

// Add a member directly. For a new email the owner sets the password and shares
// it out of band: no email, no invite link, no signup. An email that already has
// an account (one login per person) is just added here: it keeps its own
// password and reaches this workspace through the workspace switcher.
members.post("/", async (c) => {
  const session = await workspaceFor(c, c.req.query("workspace"));
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  if (session.role !== "owner") return c.json({ error: "Owners only" }, 403);

  const body = await c.req.json().catch(() => null) as { name?: string; email?: string; password?: string; role?: string } | null;
  const name = body?.name?.trim();
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password ?? "";
  const role = body?.role ?? "editor";
  if (!email) return c.json({ error: "Email is required" }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return c.json({ error: "Enter a valid email address" }, 400);
  if (role !== "owner" && role !== "editor") return c.json({ error: "Role must be owner or editor" }, 400);

  const limit = await memberLimit(c, session.workspace_id);
  if (await memberCount(c, session.workspace_id) >= limit) return c.json({ error: `Member limit of ${limit} reached` }, 400);

  const existing = await c.env.DB.prepare("SELECT id, name FROM users WHERE email = ?").bind(email).first<{ id: string; name: string }>();
  if (existing) {
    const member = await c.env.DB.prepare("SELECT 1 FROM memberships WHERE workspace_id = ? AND user_id = ?").bind(session.workspace_id, existing.id).first();
    if (member) return c.json({ error: "This person is already a member" }, 409);
    await c.env.DB.prepare("INSERT INTO memberships (workspace_id, user_id, role) VALUES (?, ?, ?)").bind(session.workspace_id, existing.id, role).run();
    const workspace = await c.env.DB.prepare("SELECT name FROM workspaces WHERE id = ?").bind(session.workspace_id).first<{ name: string }>();
    return c.json({ data: { id: existing.id, name: existing.name, email, role, created: false, workspaceName: workspace?.name ?? null } }, 201);
  }

  if (!name) return c.json({ error: "Name is required for a new account" }, 400);
  if (password.length < 12) return c.json({ error: "Password must be at least 12 characters" }, 400);
  const userId = crypto.randomUUID();
  try {
    await c.env.DB.batch([
      c.env.DB.prepare("INSERT INTO users (id, email, name, password_hash, email_verified_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)").bind(userId, email, name, await hashPassword(password)),
      c.env.DB.prepare("INSERT INTO memberships (workspace_id, user_id, role) VALUES (?, ?, ?)").bind(session.workspace_id, userId, role),
    ]);
  } catch (error) {
    console.error("member create failed", error);
    return c.json({ error: "Could not create the account" }, 400);
  }
  return c.json({ data: { id: userId, name, email, role, created: true } }, 201);
});

// Owner-only actions
members.patch("/:userId", async (c) => {
  const session = await workspaceFor(c, c.req.query("workspace"));
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  if (session.role !== "owner") return c.json({ error: "Owners only" }, 403);
  const userId = c.req.param("userId");
  const body = await c.req.json().catch(() => null) as { role?: string } | null;
  if (body?.role !== "owner" && body?.role !== "editor") return c.json({ error: "Role must be owner or editor" }, 400);

  if (userId === session.user_id && body.role === "editor") return c.json({ error: "You cannot demote yourself" }, 400);
  if (body.role === "editor") {
    const { results } = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM memberships WHERE workspace_id = ? AND role = 'owner'").bind(session.workspace_id).all<{ n: number }>();
    if ((results[0]?.n ?? 0) <= 1) return c.json({ error: "Workspace must keep at least one owner" }, 400);
  }
  await c.env.DB.prepare("UPDATE memberships SET role = ? WHERE workspace_id = ? AND user_id = ?").bind(body.role, session.workspace_id, userId).run();
  return c.json({ data: { ok: true } });
});

members.delete("/:userId", async (c) => {
  const session = await workspaceFor(c, c.req.query("workspace"));
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  if (session.role !== "owner") return c.json({ error: "Owners only" }, 403);
  const userId = c.req.param("userId");
  if (userId === session.user_id) return c.json({ error: "You cannot remove yourself" }, 400);
  const member = await c.env.DB.prepare("SELECT role FROM memberships WHERE workspace_id = ? AND user_id = ?").bind(session.workspace_id, userId).first<{ role: string }>();
  if (!member) return c.json({ error: "Member not found" }, 404);
  if (member.role === "owner") {
    const { results } = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM memberships WHERE workspace_id = ? AND role = 'owner'").bind(session.workspace_id).all<{ n: number }>();
    if ((results[0]?.n ?? 0) <= 1) return c.json({ error: "Workspace must keep at least one owner" }, 400);
  }
  await c.env.DB.prepare("DELETE FROM memberships WHERE workspace_id = ? AND user_id = ?").bind(session.workspace_id, userId).run();
  return c.json({ data: { ok: true } });
});
