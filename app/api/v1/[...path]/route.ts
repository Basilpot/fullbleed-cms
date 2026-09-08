import api from "@/api/app";
import { env } from "cloudflare:workers";

type Context = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, { params }: Context) {
  return api.fetch(request, env);
}

export async function OPTIONS(request: Request, { params }: Context) {
  return api.fetch(request, env);
}

export async function POST(request: Request, { params }: Context) {
  return api.fetch(request, env);
}
