"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Check, ChevronsUpDown } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export type WorkspaceOption = { slug: string; name: string; role: "owner" | "editor" }

const ROLE_LABEL = { owner: "Owner", editor: "Editor" } as const

function Monogram({ label }: { label: string }) {
  return (
    <span className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
      {label.slice(0, 2).toUpperCase()}
    </span>
  )
}

// Sidebar header: the open workspace, and a menu of every workspace the user
// belongs to. Switching keeps the current section (posts, media, …) but drops
// anything deeper, since ids don't carry across workspaces.
export function WorkspaceSwitcher({
  current,
  workspaces,
}: {
  current: WorkspaceOption
  workspaces: WorkspaceOption[]
}) {
  const pathname = usePathname()
  const { isMobile } = useSidebar()
  const section = pathname.split("/")[3] || "dashboard"
  const label = current.name.trim() || current.slug

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Monogram label={label} />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{label}</span>
                <span className="truncate text-xs text-muted-foreground">{ROLE_LABEL[current.role]}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="start"
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">Workspaces</DropdownMenuLabel>
            {workspaces.map((workspace) => {
              const name = workspace.name.trim() || workspace.slug
              const active = workspace.slug === current.slug
              return (
                <DropdownMenuItem key={workspace.slug} asChild className="gap-2 p-2">
                  <Link href={`/workspace/${workspace.slug}/${section}`} aria-current={active ? "page" : undefined}>
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-sm border text-[10px] font-semibold">
                      {name.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="flex-1 truncate">{name}</span>
                    <span className="text-xs text-muted-foreground">{ROLE_LABEL[workspace.role]}</span>
                    <Check className={active ? "size-4" : "size-4 invisible"} aria-hidden="true" />
                  </Link>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
