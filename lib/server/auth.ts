import { env } from "cloudflare:workers";

const encoder = new TextEncoder();
const SESSION_DAYS = 30;

export type Session = { id: string; email: string; name: string; is_platform_admin: number; workspace_id: string; workspace_name: string; workspace_slug: string; role: "owner" | "editor" };

function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256(value: string) {
  return hex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

async function passwordKey(password: string, salt: Uint8Array) {
  const base = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  return crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 600_000 }, base, 256);
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${btoa(String.fromCharCode(...salt))}$${hex(await passwordKey(password, salt))}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [algorithm, saltBase64, expected] = stored.split("$");
  if (algorithm !== "pbkdf2" || !saltBase64 || !expected) return false;
  const salt = Uint8Array.from(atob(saltBase64), (char) => char.charCodeAt(0));
  const actual = hex(await passwordKey(password, salt));
  if (actual.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < actual.length; index += 1) mismatch |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  return mismatch === 0;
}

export async function createSession(userId: string) {
  const token = `kb_sess_${crypto.randomUUID().replaceAll("-", "")}`;
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString();
  await env.DB.prepare("INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)")
    .bind(crypto.randomUUID(), userId, await sha256(token), expiresAt).run();
  return { token, expiresAt };
}

export async function sessionFor(token?: string) {
  if (!token) return null;
  return env.DB.prepare(`SELECT users.id, users.email, users.name, users.is_platform_admin,
      memberships.workspace_id, workspaces.name AS workspace_name, workspaces.slug AS workspace_slug, memberships.role
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    JOIN memberships ON memberships.user_id = users.id
    JOIN workspaces ON workspaces.id = memberships.workspace_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > CURRENT_TIMESTAMP
    ORDER BY memberships.role = 'owner' DESC, memberships.created_at ASC LIMIT 1`)
    .bind(await sha256(token)).first<Session>();
}

export async function deleteSession(token?: string) {
  if (token) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
}

export function sessionCookie(token: string, expiresAt: string) {
  return { name: "keybud_session", value: token, httpOnly: true, sameSite: "lax" as const, secure: true, path: "/", expires: new Date(expiresAt) };
}
