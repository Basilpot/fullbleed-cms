import api from "@/api/app";
import { env } from "cloudflare:workers";

export async function GET(request: Request) {
  return api.fetch(request, env);
}
