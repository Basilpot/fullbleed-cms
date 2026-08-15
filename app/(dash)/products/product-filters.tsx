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
import { Filter, SlidersHorizontal, X } from "lucide-react";

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

  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);

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

  const clearAll = () => {
    const next = new URLSearchParams(window.location.search);
    for (const key of ["category", "brand", "sort", "order"]) {
      next.delete(key);
    }
    next.set("page", "1");
    router.push(`?${next.toString()}`, { scroll: false });
  };

  const activeCount = [category, brand, sort !== "newest" ? "sort" : ""].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen((o) => !o)}
          className="gap-2"
        >
          <Filter className="size-4" />
          Filters
          {activeCount > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
              {activeCount}
            </span>
          )}
        </Button>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="h-9 w-48">
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

      {open && (
        <div className="mb-4 flex flex-wrap items-end gap-4 rounded-md border p-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Category</label>
            <Select value={category} onValueChange={(v) => setParam("category", v === "all" ? "" : v)}>
              <SelectTrigger className="w-52">
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
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Brand</label>
            <Select value={brand} onValueChange={(v) => setParam("brand", v === "all" ? "" : v)}>
              <SelectTrigger className="w-52">
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
          </div>

          {activeCount > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={clearAll} className="gap-1">
              <X className="size-4" />
              Clear
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
