import { env } from "cloudflare:workers";
import { createSession, hashPassword, sessionCookie } from "@/lib/server/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { name?: string; email?: string; password?: string; workspaceName?: string } | null;
  const name = body?.name?.trim();
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password;
  const workspaceName = body?.workspaceName?.trim();
  if (!name || !email || !password || !workspaceName || password.length < 12) return Response.json({ message: "Name, workspace, email, and a 12-character password are required" }, { status: 400 });
  const userId = crypto.randomUUID();
  const workspaceId = crypto.randomUUID();
  const slug = workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!slug) return Response.json({ message: "Workspace name must contain letters or numbers" }, { status: 400 });
  const admin = email === (env.PLATFORM_ADMIN_EMAIL ?? "").toLowerCase() ? 1 : 0;
  try {
    await env.DB.batch([
      env.DB.prepare("INSERT INTO users (id, email, name, password_hash, email_verified_at, is_platform_admin) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)").bind(userId, email, name, await hashPassword(password), admin),
      env.DB.prepare("INSERT INTO workspaces (id, name, slug) VALUES (?, ?, ?)").bind(workspaceId, workspaceName, slug),
      env.DB.prepare("INSERT INTO memberships (workspace_id, user_id, role) VALUES (?, ?, 'owner')").bind(workspaceId, userId),
    ]);
  } catch (error) {
    console.error("register failed", error);
    return Response.json({ message: "Email or workspace name already exists", detail: error instanceof Error ? error.message : String(error) }, { status: 409 });
  }
  const session = await createSession(userId);
  const response = Response.json({ data: { user: { id: userId, name, email }, workspace: { id: workspaceId, name: workspaceName, slug } } }, { status: 201 });
  response.headers.append("set-cookie", `${sessionCookie(session.token, session.expiresAt).name}=${session.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 86_400}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`);
  return response;
}
