import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { sessionFor } from "@/lib/server/auth";

export default async function DashRedirect({ params }: { params: Promise<{ rest: string[] }> }) {
  const { rest } = await params;
  const segments = rest ?? [];
  const cookieStore = await cookies();
  if (segments[0] === "workspace") notFound();
  const session = await sessionFor(cookieStore.get("keybud_session")?.value);
  if (!session) redirect("/login");
  const base = `/workspace/${session.workspace_slug}`;
  redirect(segments.length ? `${base}/${segments.join("/")}` : `${base}/dashboard`);
}