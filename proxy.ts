import { NextRequest, NextResponse } from "next/server";

export default function proxy(req: NextRequest) {
  const slug = req.cookies.get("active_tenant")?.value;
  if (!slug) {
    return NextResponse.next();
  }
  const headers = new Headers(req.headers);
  headers.set("x-tenant-slug", slug);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/api/:path*"],
};
