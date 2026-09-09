import { Hono } from "hono";
import { sha256 } from "@/lib/server/auth";
import { sendInviteEmail } from "@/lib/server/email";
import { workspaceFor } from "./workspace";
import type { ApiEnv } from "./app";

export const members = new Hono<ApiEnv>();

function randomToken(prefix: string) {
  return `${prefix}${crypto.randomUUID().replaceAll("-", "")}`;
}

// List members + pending invitations
members.get("/", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const memberRows = await c.env.DB.prepare(
    `SELECT users.id, users.name, users.email, users.image_url, users.created_at, memberships.role
     FROM memberships JOIN users ON users.id = memberships.user_id
     WHERE memberships.workspace_id = ? ORDER BY memberships.role = 'owner' DESC, users.name`,
  ).bind(session.workspace_id).all<{ id: string; name: string; email: string; image_url: string | null; created_at: string; role: "owner" | "editor" }>();

  const inviteRows = await c.env.DB.prepare(
    `SELECT id, email, role, expires_at, accepted_at, created_at FROM invitations
     WHERE workspace_id = ? ORDER BY created_at DESC`,
  ).bind(session.workspace_id).all<{ id: string; email: string; role: string; expires_at: string; accepted_at: string | null; created_at: string }>();

  return c.json({
    data: {
      members: memberRows.results.map((m) => ({ id: m.id, name: m.name, email: m.email, imageUrl: m.image_url, role: m.role, createdAt: m.created_at })),
      invitations: inviteRows.results.map((i) => ({ id: i.id, email: i.email, role: i.role, expiresAt: i.expires_at, acceptedAt: i.accepted_at, createdAt: i.created_at })),
    },
  });
});

// Invite a member by email (they accept via the shared link, no mailer)
members.post("/", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  if (session.role !== "owner") return c.json({ error: "Owners only" }, 403);

  const body = await c.req.json().catch(() => null) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  if (!email) return c.json({ error: "Email is required" }, 400);

  const { results: memberCount } = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM memberships WHERE workspace_id = ?").bind(session.workspace_id).all<{ n: number }>();
  const limitRow = await c.env.DB.prepare("SELECT member_limit FROM workspaces WHERE id = ?").bind(session.workspace_id).first<{ member_limit: number }>();
  const limit = limitRow?.member_limit ?? 2;
  if ((memberCount[0]?.n ?? 0) >= limit) return c.json({ error: `Member limit of ${limit} reached` }, 400);

  const token = randomToken("kb_inv_");
  const expiresAt = new Date(Date.now() + 7 * 86_400_000).toISOString();
  try {
    await c.env.DB.prepare(
      "INSERT INTO invitations (id, workspace_id, email, role, token_hash, expires_at) VALUES (?, ?, ?, 'editor', ?, ?)",
    ).bind(crypto.randomUUID(), session.workspace_id, email, await sha256(token), expiresAt).run();
  } catch {
    return c.json({ error: "An invitation for this email already exists" }, 409);
  }
  const workspace = await c.env.DB.prepare("SELECT name FROM workspaces WHERE id = ?").bind(session.workspace_id).first<{ name: string }>();
  sendInviteEmail(email, workspace?.name ?? "your workspace", `${c.env.APP_URL}/invite/${token}`).catch((error) => console.error("invite email failed", error));
  return c.json({ data: { token, email, expiresAt } }, 201);
});

// Public: invitation metadata for the accept page
members.get("/invitations/:token", async (c) => {
  const row = await c.env.DB.prepare(
    `SELECT invitations.email, invitations.role, invitations.expires_at, invitations.accepted_at, workspaces.name AS workspace_name
     FROM invitations JOIN workspaces ON workspaces.id = invitations.workspace_id
     WHERE invitations.token_hash = ?`,
  ).bind(await sha256(c.req.param("token"))).first<{ email: string; role: string; expires_at: string; accepted_at: string | null; workspace_name: string }>();
  if (!row) return c.json({ error: "Invitation not found" }, 404);
  return c.json({ data: { email: row.email, role: row.role, expiresAt: row.expires_at, acceptedAt: row.accepted_at, workspaceName: row.workspace_name } });
});

// Logged-in user accepts an invitation and joins the workspace
members.post("/accept", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "You need to be logged in to accept" }, 401);

  const body = await c.req.json().catch(() => null) as { token?: string } | null;
  const token = body?.token;
  if (!token) return c.json({ error: "Token is required" }, 400);

  const invite = await c.env.DB.prepare(
    `SELECT invitations.id, invitations.workspace_id, invitations.role, invitations.expires_at, invitations.accepted_at, workspaces.slug
     FROM invitations JOIN workspaces ON workspaces.id = invitations.workspace_id
     WHERE invitations.token_hash = ?`,
  ).bind(await sha256(token)).first<{ id: string; workspace_id: string; role: string; expires_at: string; accepted_at: string | null; slug: string }>();
  if (!invite) return c.json({ error: "Invitation not found" }, 404);
  if (invite.expires_at < new Date().toISOString()) return c.json({ error: "Invitation has expired" }, 410);
  if (invite.accepted_at) return c.json({ error: "Invitation already accepted" }, 410);

  const member = await c.env.DB.prepare("SELECT 1 FROM memberships WHERE workspace_id = ? AND user_id = ?").bind(invite.workspace_id, session.user_id).first();
  if (!member) {
    try {
      await c.env.DB.prepare("INSERT INTO memberships (workspace_id, user_id, role) VALUES (?, ?, ?)").bind(invite.workspace_id, session.user_id, invite.role).run();
    } catch {
      return c.json({ error: "Member limit reached" }, 400);
    }
  }
  await c.env.DB.prepare("UPDATE invitations SET accepted_at = CURRENT_TIMESTAMP WHERE id = ?").bind(invite.id).run();
  return c.json({ data: { workspace: { slug: invite.slug } } });
});

// Owner-only actions
members.delete("/invitations/:id", async (c) => {
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  if (session.role !== "owner") return c.json({ error: "Owners only" }, 403);
  await c.env.DB.prepare("DELETE FROM invitations WHERE id = ? AND workspace_id = ?").bind(c.req.param("id"), session.workspace_id).run();
  return c.json({ data: { ok: true } });
});

members.patch("/:userId", async (c) => {
  const session = await workspaceFor(c);
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
  const session = await workspaceFor(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  if (session.role !== "owner") return c.json({ error: "Owners only" }, 403);
  const userId = c.req.param("userId");
  if (userId === session.user_id) return c.json({ error: "You cannot remove yourself" }, 400);
  const { results } = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM memberships WHERE workspace_id = ? AND role = 'owner'").bind(session.workspace_id).all<{ n: number }>();
  if ((results[0]?.n ?? 0) <= 1) return c.json({ error: "Workspace must keep at least one owner" }, 400);
  await c.env.DB.prepare("DELETE FROM memberships WHERE workspace_id = ? AND user_id = ?").bind(session.workspace_id, userId).run();
  return c.json({ data: { ok: true } });
});