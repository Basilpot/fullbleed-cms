"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Badge,
} from "@/components/ui/badge";
import { ChevronRight, Minus, Package, Plus, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ColumnDef } from "@tanstack/react-table";

type StockVariant = {
  id: string;
  name: string;
  sku: string | null;
  price: string | number;
  stock: number;
  image?: string;
};

type StockProduct = {
  id: string;
  title: string;
  slug: string;
  status: string;
  subRows: StockVariant[];
};

const LOW_STOCK = 5;

function variantRows(product: any): StockVariant[] {
  const variants: any[] = product?.variants ?? [];
  if (variants.length === 0) return [];
  return variants.map((v: any) => ({
    id: String(v.id),
    name: v.name ?? "",
    sku: v.sku ?? null,
    price: v.price ?? 0,
    stock: Number(v.stock ?? 0),
    image: v.image ?? "",
  }));
}

const BACKEND = "/api/variants";

export default function StockPage() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<StockProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState<Record<string, number>>({});

  const search = (searchParams.get("search") ?? "").trim().toLowerCase();
  const filteredProducts = search
    ? products.filter((p) => {
        const matches = (value: string | null) =>
          value?.toLowerCase().includes(search) ?? false;
        return (
          matches(p.title) ||
          matches(p.slug) ||
          p.subRows.some((v) => matches(v.name) || matches(v.sku))
        );
      })
    : products;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/products?limit=100`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      const mapped: StockProduct[] = (data.products ?? []).map((p: any) => ({
        id: String(p.id),
        title: p.title,
        slug: p.slug,
        status: p.status,
        subRows: variantRows(p),
      }));
      setProducts(mapped);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setVariantStock = async (variantId: string, stock: number) => {
    setSaving((s) => ({ ...s, [variantId]: true }));
    try {
      const res = await fetch(`${BACKEND}/${variantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ stock }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.message || "Update failed");
      toast.success("Stock updated");
      setDirty((d) => {
        const next = { ...d };
        delete next[variantId];
        return next;
      });
    } catch (e: any) {
      toast.error(e.message || "Update failed");
    } finally {
      setSaving((s) => ({ ...s, [variantId]: false }));
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      id: "expander",
      header: () => <span className="sr-only">Expand</span>,
      cell: ({ row }) =>
        row.getCanExpand() ? (
          <button
            type="button"
            onClick={row.getToggleExpandedHandler()}
            className="flex size-6 items-center justify-center rounded hover:bg-muted"
          >
            <ChevronRight
              className={cn(
                "size-4 transition-transform",
                row.getIsExpanded() && "rotate-90",
              )}
            />
          </button>
        ) : (
          <span className="flex size-6 items-center justify-center text-muted-foreground">
            <Package className="size-3.5" />
          </span>
        ),
    },
    {
      accessorKey: "title",
      header: () => "Item",
      cell: ({ row }) =>
        row.depth === 0 ? (
          <div className="font-medium">{row.original.title}</div>
        ) : (
          <div className={cn(row.depth === 1 && "ml-8")}>
            <span className="text-muted-foreground">· </span>
            {row.original.name || "Default"}
            {row.original.sku ? (
              <span className="ml-2 font-mono text-xs text-muted-foreground">
                {row.original.sku}
              </span>
            ) : null}
          </div>
        ),
    },
    {
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) =>
        row.depth === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span>
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 2,
            }).format(Number(row.original.price ?? 0))}
          </span>
        ),
    },
    {
      accessorKey: "stock",
      header: () => <div className="text-center">Stock</div>,
      cell: ({ row }) => {
        if (row.depth === 0) {
          const variants = row.original.subRows ?? [];
          const total = variants.reduce((n: number, v: any) => n + Number(v.stock ?? 0), 0);
          return (
            <div className="text-center font-medium">
              {variants.length ? total : "—"}
            </div>
          );
        }
        const v = row.original;
        const dirtyVal = dirty[v.id];
        const current = Number(v.stock ?? 0);
        const base = dirtyVal !== undefined ? dirtyVal : current;
        const bump = (delta: number) =>
          setDirty((d) => ({ ...d, [v.id]: Math.max(0, base + delta) }));
        return (
          <div className="flex items-center justify-center gap-2">
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-8 w-8"
              onClick={() => bump(-1)}
              disabled={base <= 0 || saving[v.id]}
            >
              <Minus className="size-4" />
            </Button>
            <Input
              type="number"
              min={0}
              defaultValue={current}
              key={v.id}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (Number.isFinite(val) && val !== current) setDirty((d) => ({ ...d, [v.id]: val }));
                else
                  setDirty((d) => {
                    const next = { ...d };
                    delete next[v.id];
                    return next;
                  });
              }}
              className="h-8 w-24 text-center"
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-8 w-8"
              onClick={() => bump(1)}
              disabled={saving[v.id]}
            >
              <Plus className="size-4" />
            </Button>
            {(dirtyVal !== undefined || saving[v.id]) && (
              <Button
                size="sm"
                disabled={saving[v.id]}
                onClick={() => setVariantStock(v.id, dirtyVal ?? current)}
              >
                {saving[v.id] ? "Saving…" : "Save"}
              </Button>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) =>
        row.depth === 0 && row.original.status === "DRAFT" ? (
          <Badge variant="secondary">Draft</Badge>
        ) : (
          <span />
        ),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <PageHeader title="Stock & Inventory" description="Track and update product and variant stock">
          <Button type="button" variant="outline" onClick={load} disabled={loading}>
            <RefreshCcw className={cn("size-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </PageHeader>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 p-6 text-center text-sm text-destructive">
          {error}
        </div>
      ) : (
        <DataTable
          data={filteredProducts}
          columns={columns}
          isLoading={loading && products.length === 0}
          searchPlaceholder="Search products…"
          emptyMessage="No products found."
        />
      )}
    </div>
  );
}
