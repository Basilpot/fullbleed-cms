import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { sessionFor } from "@/lib/server/auth";
import { Button } from "@/components/ui/button";

function MarketingPage() {
  return (
    <main className="flex min-h-[80vh] items-center justify-center px-6">
      <section className="mx-auto max-w-2xl text-center">
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Publish content without the CMS overhead.
        </h1>
        <p className="text-pretty mt-4 text-lg text-muted-foreground">
          Fullbleed is a lightweight, multitenant content system for managing and
          publishing simple website content without dragging in a full-scale CMS.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/signup">Create workspace</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}

export default async function DashRedirect({ params }: { params: Promise<{ rest: string[] }> }) {
  const { rest } = await params;
  const segments = rest ?? [];
  const cookieStore = await cookies();
  if (segments[0] === "workspace") notFound();
  const session = await sessionFor(cookieStore.get("fullbleed_session")?.value);
  if (!session) {
    if (segments.length === 0) return <MarketingPage />;
    redirect("/login");
  }
  const base = `/workspace/${session.workspace_slug}`;
  redirect(segments.length ? `${base}/${segments.join("/")}` : `${base}/dashboard`);
}