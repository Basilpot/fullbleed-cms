"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export const STATUS_TABS = ["all", "draft", "published"] as const;
export const STATUS_PARAM: Record<(typeof STATUS_TABS)[number], string> = {
  all: "all",
  draft: "draft",
  published: "published",
};

type Option = { id: string; name: string; slug: string };
type CategoryNode = Option & { children?: CategoryNode[] };

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "slug-asc", label: "Title: A to Z" },
  { value: "slug-desc", label: "Title: Z to A" },
];

function flattenCategories(
  nodes: CategoryNode[],
  depth = 0,
  out: { value: string; label: string }[] = [],
) {
  for (const node of nodes) {
    out.push({ value: node.slug, label: `${"\u00A0".repeat(depth * 4)}${node.name}` });
    if (node.children?.length) flattenCategories(node.children, depth + 1, out);
  }
  return out;
}

function toSortParam(value: string): { sort?: string; order?: string } {
  if (value === "newest") return {};
  if (value === "slug-asc") return { sort: "slug", order: "asc" };
  if (value === "slug-desc") return { sort: "slug", order: "desc" };
  return { sort: value };
}

function sortFromParams(params: URLSearchParams): string {
  const order = params.get("order");
  const sort = params.get("sort");
  if (!sort) return "newest";
  if (sort === "slug") return order === "asc" ? "slug-asc" : "slug-desc";
  return sort;
}

export function ProductFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams.toString());

  const [categories, setCategories] = useState<{ value: string; label: string }[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);

  const status: (typeof STATUS_TABS)[number] = STATUS_TABS.includes(
    searchParams.get("status") as (typeof STATUS_TABS)[number],
  )
    ? (searchParams.get("status") as (typeof STATUS_TABS)[number])
    : "all";
  const category = params.get("category") ?? "";
  const brand = params.get("brand") ?? "";
  const sort = sortFromParams(params);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetch("/api/categories", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/brands", { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([cat, br]) => {
        if (!mounted) return;
        setCategories(flattenCategories(cat?.categories ?? []));
        setBrands(br?.brands ?? []);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(window.location.search);
    if (value) next.set(key, value);
    else next.delete(key);
    next.set("page", "1");
    router.push(`?${next.toString()}`, { scroll: false });
  };

  const setSort = (value: string) => {
    const next = new URLSearchParams(window.location.search);
    const { sort: s, order } = toSortParam(value);
    if (s) next.set("sort", s);
    else next.delete("sort");
    if (order) next.set("order", order);
    else next.delete("order");
    next.set("page", "1");
    router.push(`?${next.toString()}`, { scroll: false });
  };

  const setStatus = (tab: (typeof STATUS_TABS)[number]) => {
    const next = new URLSearchParams(window.location.search);
    if (tab === "all") next.delete("status");
    else next.set("status", tab);
    next.set("page", "1");
    router.push(`?${next.toString()}`, { scroll: false });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab}
            type="button"
            variant="ghost"
            onClick={() => setStatus(tab)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              status === tab
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Button>
        ))}
      </div>
      <Select value={category} onValueChange={(v) => setParam("category", v === "all" ? "" : v)}>
        <SelectTrigger className="h-9 w-44">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.value} value={c.value}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={brand} onValueChange={(v) => setParam("brand", v === "all" ? "" : v)}>
        <SelectTrigger className="h-9 w-44">
          <SelectValue placeholder="All brands" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All brands</SelectItem>
          {brands.map((b) => (
            <SelectItem key={b.id} value={b.slug}>
              {b.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={sort} onValueChange={setSort}>
        <SelectTrigger className="h-9 w-44">
          <SlidersHorizontal className="size-4 text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORTS.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}