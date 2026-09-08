import { publicApi } from "@/lib/server/public-api";

type Context = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, { params }: Context) {
  return publicApi(request, (await params).path);
}

export async function OPTIONS(request: Request, { params }: Context) {
  return publicApi(request, (await params).path);
}
