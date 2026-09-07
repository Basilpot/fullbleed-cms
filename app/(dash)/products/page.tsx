"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/ui/data-table";
import { PlusIcon } from "lucide-react";
import { createColumns } from "./columns";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ProductFilters, STATUS_PARAM, STATUS_TABS } from "./product-filters";

type StatusTab = (typeof STATUS_TABS)[number];

export default function Products() {
  const [productData, setProductData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<any>();

  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "10");
  const search = searchParams.get("search") ?? "";
  const status: StatusTab = STATUS_TABS.includes(
    searchParams.get("status") as StatusTab,
  )
    ? (searchParams.get("status") as StatusTab)
    : "all";
  const slugSort: "asc" | "desc" | null =
    searchParams.get("sort") === "slug" &&
    (searchParams.get("order") === "asc" || searchParams.get("order") === "desc")
      ? (searchParams.get("order") as "asc" | "desc")
      : null;
  const category = searchParams.get("category") ?? "";
  const brand = searchParams.get("brand") ?? "";
  const sort = searchParams.get("sort") ?? "";
  const order = searchParams.get("order") ?? "";

  useEffect(() => {
    let mounted = true;

    async function loadProducts() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
          status: STATUS_PARAM[status],
        });
        if (search) params.set("search", search);
        if (category) params.set("category", category);
        if (brand) params.set("brand", brand);
        if (sort) params.set("sort", sort);
        if (order) params.set("order", order);
        if (slugSort) {
          params.set("sort", "slug");
          params.set("order", slugSort);
        }

        const res = await fetch(`/api/products?${params}`, {
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) throw new Error("Failed to fetch products");

        const data = await res.json();

        const products = data?.products ?? [];
        setPagination(data?.pagination);

        const mapped: any[] = products.map((product: any) => ({
          id: String(product.id),
          thumbnail: product.images?.[0] || "",
          title: product.title || "",
          slug: product.slug,
          category: product.category?.name || "",
          price: product.price,
          maxPrice: product.maxPrice,
          compareAtPrice: product.compareAtPrice,
          status: product.status || "",
          isFeatured: product.isFeatured || false,
          updatedAt: product.updatedAt,
        }));

        if (mounted) setProductData(mapped);
      } catch (err: any) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadProducts();
    return () => {
      mounted = false;
    };
  }, [page, limit, search, status, slugSort, category, brand, sort, order]);

  const toggleSlugSort = () => {
    const params = new URLSearchParams(window.location.search);
    if (!slugSort) {
      params.set("sort", "slug");
      params.set("order", "asc");
    } else if (slugSort === "asc") {
      params.set("sort", "slug");
      params.set("order", "desc");
    } else {
      params.delete("sort");
      params.delete("order");
    }
    params.set("page", "1");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div>
      <div className="mb-6">
        <PageHeader title="All Products" description="Manage your store inventory">
          <Link href="/products/edit/">
            <Button size="lg">
              <PlusIcon /> Add New Product
            </Button>
          </Link>
        </PageHeader>
      </div>

      <DataTable
        data={productData}
        columns={createColumns(
          (id) => setProductData((prev) => prev.filter((t) => t.id !== id)),
          slugSort,
          toggleSlugSort,
        )}
        pagination={pagination}
        isLoading={loading && productData.length === 0}
        toolbar={<ProductFilters />}
      />
    </div>
  );
}
