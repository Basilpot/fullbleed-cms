"use client"

import * as React from "react"
import Link from "next/link"
import {
  LucideBadgeCheck,
  LucideColumnsSettings,
  LucideContact2,
  LucideCopyX,
  LucideFolder,
  LucideForm,
  LucideGaugeCircle,
  LucideHistory,
  LucideImage,
  LucideLayers2,
  LucideMail,
  LucideNewspaper,
  LucideNotebookPen,
  LucidePackage,
  LucidePalette,
  LucideReceipt,
  LucideRoute,
  LucideSettings,
  LucideStar,
  LucideStore,
  LucideTag,
  LucideWallet,
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
import { useSidebarStore } from "@/store/use-sidebar-store"

const SIDEBAR_MENU_API = `/api/sidebar-menu`

export const navGroups: {
  label: string
  defaultOpen?: boolean
  items: { title: string; url: string; icon: LucideIcon }[]
}[] = [
  {
    label: "Content",
    defaultOpen: true,
    items: [
      { title: "Media", url: "/media", icon: LucideImage },
      { title: "Info Pages", url: "/info-pages", icon: LucideNotebookPen },
      { title: "Posts", url: "/posts", icon: LucideNewspaper },
      { title: "Authors", url: "/authors", icon: LucideContact2 },
      { title: "Content Categories", url: "/info-page-category", icon: LucideCopyX },
      { title: "Testimonials", url: "/testimonials", icon: LucideStar },
      { title: "Newsletter", url: "/newsletter", icon: LucideMail },
      { title: "Redirects", url: "/redirects", icon: LucideRoute },
    ],
  },
  {
    label: "Navigation",
    items: [
      { title: "Navbar", url: "/navbar", icon: LucideForm },
      { title: "Footer", url: "/footer", icon: LucideColumnsSettings },
    ],
  },
  {
    label: "Settings",
    items: [
      { title: "Settings", url: "/settings", icon: LucideSettings },
      { title: "Basic Brand", url: "/settings/brand", icon: LucidePalette },
      { title: "Contact & Social", url: "/settings/contact", icon: LucideContact2 },
      { title: "Documents", url: "/settings/documents", icon: LucideFolder },
      { title: "Reviews", url: "/settings/reviews", icon: LucideStar },
      { title: "Sidebar", url: "/settings/sidebar", icon: LucideColumnsSettings },
    ],
  },
]

const QUICK_ACTIONS = [
  { title: "Dashboard", url: "/dashboard", icon: LucideGaugeCircle },
  { title: "Products", url: "/products", icon: LucidePackage },
  { title: "Categories", url: "/categories", icon: LucideLayers2 },
  { title: "Brands", url: "/brands", icon: LucideBadgeCheck },
  { title: "Tags", url: "/tags", icon: LucideTag },
  { title: "Orders", url: "/orders", icon: LucideReceipt },
  { title: "Payments", url: "/payments", icon: LucideWallet },
]

const SECONDARY_NAV = [
  { title: "Changelog", url: "/changelog", icon: LucideHistory },
]

export function AppSidebar({
  companyName,
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  companyName?: string
  user?: { name: string; email: string }
}) {
  const hidden = useSidebarStore((s) => s.hidden)
  const setHidden = useSidebarStore((s) => s.setHidden)

  React.useEffect(() => {
    fetch(SIDEBAR_MENU_API)
      .then((res) => res.json())
      .then((data) => {
        const items: { url: string; visible: boolean }[] =
          data?.data?.items ?? []
        setHidden(items.filter((i) => i.visible === false).map((i) => i.url))
      })
      .catch(() => {})
  }, [setHidden])

  const navMain = [
    ...QUICK_ACTIONS,
    ...navGroups.map((group) => ({
      title: group.label,
      url: "#",
      isActive: group.defaultOpen,
      items: group.items.filter((item) => !hidden.includes(item.url)),
    })).filter((group) => group.items.length > 0),
  ]

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
                    {companyName ?? "Ash and Moss"}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
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
