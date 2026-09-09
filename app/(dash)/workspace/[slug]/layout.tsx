import { cookies } from "next/headers";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/sidebar/site-header";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Toaster } from "sonner";
import { redirect } from "next/navigation";
import { sessionFor } from "@/lib/server/auth";

const FALLBACK_NAME = "Keybud";

const AdminDashboardLayout = async ({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) => {
  const { slug } = await params;
  const cookieStore = await cookies();

  const session = await sessionFor(cookieStore.get("keybud_session")?.value);
  if (!session) redirect("/login");
  if (session.workspace_slug !== slug) redirect(`/workspace/${session.workspace_slug}/dashboard`);

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
        companyName={session.workspace_name ?? FALLBACK_NAME}
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
      </SidebarInset>
    </SidebarProvider>
  );
};

export default AdminDashboardLayout;