import { env } from "cloudflare:workers";
import { sha256 } from "@/lib/server/auth";

export async function POST(request: Request) {
  const token = request.headers.get("cookie")?.match(/(?:^|;\s*)keybud_session=([^;]+)/)?.[1];
  if (token) {
    await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?")
      .bind(await sha256(token))
      .run();
  }
  const response = Response.json({ ok: true });
  const { protocol } = new URL(request.url);
  response.headers.append(
    "set-cookie",
    `keybud_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${protocol === "https:" ? "; Secure" : ""}`,
  );
  return response;
}