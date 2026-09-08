import api from "@/api/app";
import { env } from "cloudflare:workers";

type Context = { params: Promise<{ id: string }> };

async function forward(request: Request, { params }: Context) {
  const { id } = await params;
  const url = new URL(request.url);
  url.pathname = `/api/inquiries/${id}`;
  return api.fetch(new Request(url, request), env);
}

export async function PATCH(request: Request, context: Context) { return forward(request, context); }
export async function DELETE(request: Request, context: Context) { return forward(request, context); }
