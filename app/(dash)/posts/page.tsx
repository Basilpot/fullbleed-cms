"use client";

import { Button } from "@/components/ui/button";
import { DataTable, type TPagination } from "@/components/ui/data-table";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { blogsColumns } from "./columns";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type BlogCategory = {
  id: string;
  categoryName: string;
  categoryHandle: string;
};

export default function Blogs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [blogs, setBlogs] = useState<any[]>([]);
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "10");
  const [pagination, setPagination] = useState<TPagination>();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  // "all" | "trash"
  const [view, setView] = useState<"all" | "trash">("all");

  useEffect(() => {
    async function fetchBlogs() {
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        });

        let url: string;
        if (view === "trash") {
          params.set("trash", "true");
          url = `/api/blogs?${params.toString()}`;
        } else if (selectedCategory !== "all") {
          url = `/api/blogs/category/${selectedCategory}?${params.toString()}`;
        } else {
          url = `/api/blogs?${params.toString()}`;
        }

        const response = await fetch(url, {
          cache: "no-store",
          credentials: "include",
        });
        const data = await response.json();
        setPagination(data?.pagination ?? undefined);
        setBlogs(data?.data ?? []);
      } catch (error) {
        console.error("Failed to fetch blogs:", error);
        setBlogs([]);
        setPagination(undefined);
      }
    }
    fetchBlogs();
  }, [view, selectedCategory, page, limit]);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch(
          `/api/info-page/categories?limit=100`,
          {
            cache: "no-store",
            credentials: "include",
          },
        );
        const data = await res.json();
        setCategories(data?.categories ?? []);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    }
    fetchCategories();
  }, []);

  const handleViewChange = (next: "all" | "trash") => {
    setView(next);
    setSelectedCategory("all");
    router.push("?page=1", { scroll: false });
  };

  const handleCategoryChange = (categorySlug: string) => {
    setSelectedCategory(categorySlug);
    setView("all");
    router.push("?page=1", { scroll: false });
  };

  return (
    <div>
      <div className="flex flex-col pb-4">
        <div className="flex justify-between items-center">
          <PageHeader
            title="Posts"
            description="Articles and informational content"
          />
          <Link href={"/posts/edit"}>
            <Button size={"lg"}>
              <Plus /> Create New
            </Button>
          </Link>
        </div>

        <div className="flex justify-between items-center py-4">
          {/* Status + Category filters */}
          <div className="flex items-center gap-2">
            {(["all", "trash"] as const).map((v) => (
              <Button
                key={v}
                onClick={() => handleViewChange(v)}
                variant={
                  view === v && selectedCategory === "all"
                    ? "default"
                    : "secondary"
                }
                className={cn(
                  view === v && selectedCategory === "all"
                    ? ""
                    : "cursor-pointer hover:text-black!",
                )}
              >
                {v === "all" ? "All" : "Trash"}
              </Button>
            ))}
          </div>

          <Select value={selectedCategory} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.categoryHandle}>
                    {cat.categoryName}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="max-w-full">
        <DataTable
          columns={blogsColumns}
          data={blogs}
          pagination={pagination}
          searchable={false}
        />
      </div>
    </div>
  );
}
