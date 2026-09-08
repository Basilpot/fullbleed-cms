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
  LucideStore,
  LucideTag,
  LucideUsers,
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
  { title: "Dashboard", url: "/dashboard", icon: LucideGaugeCircle },
  { title: "Media", url: "/media", icon: LucideImage },
  { title: "Pages", url: "/pages", icon: LucideLayers },
  { title: "Services", url: "/services", icon: LucideLayers },
  { title: "Posts", url: "/posts", icon: LucideNewspaper },
  { title: "Authors", url: "/authors", icon: LucideContact2 },
  { title: "Categories", url: "/categories", icon: LucideFolder },
  { title: "Tags", url: "/tags", icon: LucideTag },
  { title: "Redirects", url: "/redirects", icon: LucideRedo2 },
  { title: "Members", url: "/members", icon: LucideUsers },
  { title: "API Access", url: "/api-access", icon: LucideKeyRound },
]

const SECONDARY_NAV: {
  title: string
  url: string
  icon: LucideIcon
}[] = []

export function AppSidebar({
  companyName,
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  companyName?: string
  user?: { name: string; email: string }
}) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <LucideStore className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {companyName ?? "Keybud"}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={NAV_ITEMS} />
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
