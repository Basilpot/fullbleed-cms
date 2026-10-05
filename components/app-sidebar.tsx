"use client"

import * as React from "react"
import Link from "next/link"
import {
  LucideContact2,
  LucideFolder,
  LucideGaugeCircle,
  LucideImage,
  LucideKeyRound,
  LucideLayers,
  LucideNewspaper,
  LucideRedo2,
  LucideSettings,
  LucideTag,
  LucideUsers,
  type LucideIcon,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const NAV_ITEMS = [
  { title: "Dashboard", url: "dashboard", icon: LucideGaugeCircle },
  { title: "Media", url: "media", icon: LucideImage },
  { title: "Services", url: "services", icon: LucideLayers },
  { title: "Posts", url: "posts", icon: LucideNewspaper },
  { title: "Authors", url: "authors", icon: LucideContact2 },
  { title: "Categories", url: "categories", icon: LucideFolder },
  { title: "Tags", url: "tags", icon: LucideTag },
  { title: "Redirects", url: "redirects", icon: LucideRedo2 },
  { title: "Inquiries", url: "inquiries", icon: LucideNewspaper },
  { title: "Members", url: "members", icon: LucideUsers },
  { title: "API Access", url: "api-access", icon: LucideKeyRound },
]

const SECONDARY_NAV: {
  title: string;
  url: string;
  icon: LucideIcon;
}[] = [{ title: "Settings", url: "settings", icon: LucideSettings }];

export function AppSidebar({
  workspaceSlug,
  workspaceName,
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  workspaceSlug: string
  workspaceName?: string | null
  user?: { name: string; email: string }
}) {
  const base = `/workspace/${workspaceSlug}`
  const navItems = NAV_ITEMS.map((item) => ({ ...item, url: `${base}/${item.url}` }))
  const label = workspaceName?.trim() || workspaceSlug
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={`${base}/dashboard`} title={label}>
                <span className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                  {label.slice(0, 2).toUpperCase()}
                </span>
                <span className="truncate font-semibold">{label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
        <NavSecondary items={SECONDARY_NAV} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: user?.name ?? "Admin",
            email: user?.email ?? "",
          }}
        />
      </SidebarFooter>
    </Sidebar>
  )
}
