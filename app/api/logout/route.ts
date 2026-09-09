import { env } from "cloudflare:workers";
import { sha256 } from "@/lib/server/auth";

export async function POST(request: Request) {
  const token = request.headers.get("cookie")?.match(/(?:^|;\s*)fullbleed_session=([^;]+)/)?.[1];
  if (token) {
    await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?")
      .bind(await sha256(token))
      .run();
  }
  const response = Response.json({ ok: true });
  const { protocol } = new URL(request.url);
  response.headers.append(
    "set-cookie",
    `fullbleed_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${protocol === "https:" ? "; Secure" : ""}`,
  );
  return response;
}