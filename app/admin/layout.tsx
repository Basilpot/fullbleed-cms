import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { sessionFor } from "@/lib/server/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await sessionFor((await cookies()).get("fullbleed_session")?.value);
  if (!session) redirect("/login");
  if (!session.is_platform_admin) redirect(`/workspace/${session.workspace_slug}/dashboard`);

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <span className="font-semibold">Fullbleed Platform Admin</span>
        <Link href={`/workspace/${session.workspace_slug}/dashboard`} className="text-sm text-muted-foreground underline">
          Back to dashboard
        </Link>
      </header>
      <main className="mx-auto max-w-5xl p-6">{children}</main>
    </div>
  );
}