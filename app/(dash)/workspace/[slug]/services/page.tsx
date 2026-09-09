"use client";

import { Button } from "@/components/ui/button";
import { DataTable, type TPagination } from "@/components/ui/data-table";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { infoPagesColumns } from "./columns";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type InfoPageCategory = {
  id: string;
  categoryHandle: string;
  categoryName: string | null;
};

export default function InfoPages() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = usePathname().split("/")[2];
  const [status, setStatus] = useState("all");
  const [infoPages, setInfoPages] = useState<any[]>([]);
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "10");
  const search = searchParams.get("search") ?? "";
  const [pagination, setPagination] = useState<TPagination>();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [categories, setCategories] = useState<InfoPageCategory[]>([]);

  useEffect(() => {
    async function fetchInfoPages() {
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        });
        if (status !== "all")
          params.set("published", String(status === "published"));
        if (selectedCategory !== "all")
          params.set("categoryId", selectedCategory);
        if (search.trim()) params.set("search", search.trim());

        const response = await fetch(
          `/api/info-page?${params.toString()}`,
          {
            cache: "no-store",
            credentials: "include",
          },
        );
        const data = await response.json();
        setPagination(data?.data?.pagination ?? undefined);
        setInfoPages(data?.data?.infoPages ?? []);
      } catch (error) {
        console.error("Failed to fetch info pages:", error);
        setInfoPages([]);
        setPagination(undefined);
      }
    }
    fetchInfoPages();
  }, [selectedCategory, status, page, limit, search]);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch(
          `/api/info-page/categories?limit=99`,
          {
            cache: "no-store",
            credentials: "include",
          },
        );
        const data = await res.json();
        setCategories(data?.data?.categories ?? []);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    }
    fetchCategories();
  }, []);

  const handleStatusChange = (s: string) => {
    setStatus(s);
    router.push("?page=1", { scroll: false });
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    router.push("?page=1", { scroll: false });
  };

  return (
    <div>
      <div className="flex flex-col pb-4">
        <div className="flex justify-between items-center">
          <PageHeader
            title="Info Pages"
            description="Static pages like about and contact"
          />
          <Link href={`/workspace/${slug}/info-pages/edit`}>
            <Button size={"lg"}>
              <Plus /> Create New
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-full">
        <DataTable
          columns={infoPagesColumns(slug)}
          data={infoPages}
          pagination={pagination}
          searchPlaceholder="Search info pages…"
          toolbar={
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                {["all", "published", "draft"].map((s) => (
                  <Button
                    key={s}
                    type="button"
                    variant="ghost"
                    onClick={() => handleStatusChange(s)}
                    className={cn(
                      "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                      s === status
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Button>
                ))}
              </div>
              <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                <SelectTrigger className="h-9 w-44">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.categoryName ?? cat.categoryHandle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        />
      </div>
    </div>
  );
}
