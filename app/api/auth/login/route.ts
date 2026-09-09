import { env } from "cloudflare:workers";
import { createSession, sessionCookie, verifyPassword } from "@/lib/server/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: string; password?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  if (!email || !body?.password) return Response.json({ message: "Email and password are required" }, { status: 400 });
  const user = await env.DB.prepare("SELECT id, password_hash, disabled_at FROM users WHERE email = ?").bind(email).first<{ id: string; password_hash: string | null; disabled_at: string | null }>();
  if (!user?.password_hash || !(await verifyPassword(body.password, user.password_hash))) return Response.json({ message: "Invalid email or password" }, { status: 401 });
  if (user.disabled_at) return Response.json({ message: "This account has been suspended. Contact support." }, { status: 403 });
  const session = await createSession(user.id);
  const response = Response.json({ data: { ok: true } });
  response.headers.append("set-cookie", `${sessionCookie(session.token, session.expiresAt).name}=${session.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 86_400}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`);
  return response;
}
