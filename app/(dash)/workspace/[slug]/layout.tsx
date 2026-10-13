import { cookies } from "next/headers";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/sidebar/site-header";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Toaster } from "sonner";
import { redirect } from "next/navigation";
import { LAST_WORKSPACE_COOKIE, landingSessionFor, sessionFor, workspacesFor } from "@/lib/server/auth";
import { RememberWorkspace } from "@/components/remember-workspace";

const FALLBACK_NAME = "Fullbleed";

const AdminDashboardLayout = async ({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) => {
  const { slug } = await params;
  const cookieStore = await cookies();

  const token = cookieStore.get("fullbleed_session")?.value;
  // Scoped first so multi-workspace members can open a workspace that isn't their
  // newest; unscoped fallback resolves their real workspace instead of /login.
  const session = (await sessionFor(token, slug)) ?? (await landingSessionFor(token, cookieStore.get(LAST_WORKSPACE_COOKIE)?.value));
  if (!session) redirect("/login");
  if (session.workspace_slug !== slug) redirect(`/workspace/${session.workspace_slug}/dashboard`);
  const workspaces = await workspacesFor(token);

  return (
    <SidebarProvider
      defaultOpen
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        workspaceSlug={slug}
        workspaceName={session.workspace_name}
        workspaces={workspaces}
        user={{ name: session.name, email: session.email }}
      />
      <SidebarInset className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="min-w-0 flex-1 p-4">{children}</div>
        <div className="border-t border-border">
          <div className="flex items-center justify-center px-4 py-3 text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} {session.workspace_name ?? FALLBACK_NAME}
          </div>
        </div>
        <Toaster />
        <RememberWorkspace slug={slug} />
      </SidebarInset>
    </SidebarProvider>
  );
};

export default AdminDashboardLayout;