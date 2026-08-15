import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, context: any) {
  try {
    const resolvedParams: any = await (context?.params || {});
    const parts: string[] = (resolvedParams?.path as string[]) || [];
    const filename = parts.join("/");

    const apiBase = (process.env.API_BASE_URL || "http://localhost:3000/api/v1").replace(/\/+$/, "");
    const fileUrl = `${apiBase}/uploads/${encodeURIComponent(filename)}`;

    const resp = await fetch(fileUrl);
    if (!resp.ok) {
      return new NextResponse("Not found", { status: resp.status });
    }

    const headers = new Headers(resp.headers);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    return new NextResponse(resp.body, {
      status: resp.status,
      headers,
    });
  } catch (err) {
    console.error("Upload proxy error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
