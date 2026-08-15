"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { navGroups } from "@/components/app-sidebar";
import { useSidebarStore } from "@/store/use-sidebar-store";
import { SettingsHeader } from "@/components/site-config-shared";

const SIDEBAR_MENU_API = `/api/sidebar-menu`;

export default function SidebarPage() {
  const hidden = useSidebarStore((s) => s.hidden);
  const loaded = useSidebarStore((s) => s.loaded);
  const toggle = useSidebarStore((s) => s.toggle);
  const resetSidebarVisibility = useSidebarStore((s) => s.reset);
  const setHidden = useSidebarStore((s) => s.setHidden);

  const saveSidebarItems = async (nextHidden: string[]) => {
    const items = navGroups.flatMap((group) =>
      group.items.map((item) => ({
        url: item.url,
        visible: !nextHidden.includes(item.url),
      })),
    );
    try {
      await fetch(SIDEBAR_MENU_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      toast.success("Sidebar updated");
    } catch (e: any) {
      toast.error(`Sidebar update failed: ${e.message}`);
    }
  };

  const toggleItem = (url: string) => {
    const nextHidden = hidden.includes(url)
      ? hidden.filter((u) => u !== url)
      : [...hidden, url];
    toggle(url);
    saveSidebarItems(nextHidden);
  };

  const resetSidebar = () => {
    resetSidebarVisibility();
    saveSidebarItems([]);
  };

  useEffect(() => {
    if (!loaded) {
      fetch(SIDEBAR_MENU_API)
        .then((res) => res.json())
        .then((data) => {
          const items: { url: string; visible: boolean }[] =
            data?.data?.items ?? [];
          setHidden(
            items.filter((i) => i.visible === false).map((i) => i.url),
          );
        })
        .catch(() => {});
    }
  }, [loaded, setHidden]);

  return (
    <>
      <SettingsHeader
        title="Sidebar"
        description="Choose which items appear in the dashboard sidebar. Changes apply immediately."
      />
      <div className="space-y-4">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              {group.label}
            </p>
            {group.items.map((item) => {
              const isLocked = item.url === "/settings/sidebar";
              const checked = !hidden.includes(item.url);
              return (
                <label
                  key={item.url}
                  className="flex items-center gap-3 rounded-md border border-border px-3 py-2 cursor-pointer"
                >
                  <Checkbox
                    checked={checked}
                    disabled={isLocked}
                    onCheckedChange={() => toggleItem(item.url)}
                  />
                  <span className="text-sm flex-1">{item.title}</span>
                  {isLocked && (
                    <span className="text-xs text-muted-foreground">
                      Always visible
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={resetSidebar}>
          Show all items
        </Button>
      </div>
    </>
  );
}
