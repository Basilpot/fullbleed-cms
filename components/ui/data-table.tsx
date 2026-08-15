"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, LucideSearch } from "lucide-react";

export type TPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pagination?: TPagination;
  isLoading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  toolbar?: ReactNode;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pagination,
  isLoading,
  searchable = true,
  searchPlaceholder = "Search…",
  emptyMessage = "No results.",
  toolbar,
}: Readonly<DataTableProps<TData, TValue>>) {
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const searchParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const page = pagination?.page ?? Number(searchParams.get("page") ?? "1");
  const limit = pagination?.limit ?? Number(searchParams.get("limit") ?? "10");
  const totalPages = pagination?.totalPages ?? 1;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      params.set("page", "1");
      params.set("limit", String(limit));
      if (search.trim()) params.set("search", search.trim());
      else params.delete("search");
      router.push(`?${params.toString()}`, { scroll: false });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const updateUrl = (newPage: number, newLimit: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", String(newPage));
    params.set("limit", String(newLimit));
    if (search.trim()) params.set("search", search.trim());
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div>
      {searchable && (
        <div className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="relative">
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-md pl-8"
            />
            <LucideSearch className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          {toolbar}
        </div>
      )}

      <div className="overflow-hidden rounded-md border">
        <div className="max-h-[500px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 z-[1] bg-background">
              {table.getHeaderGroups().map((group) => (
                <TableRow key={group.id}>
                  {group.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {columns.map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {pagination && (
        <div className="flex flex-wrap items-center justify-between gap-3 py-4">
          <p className="text-sm text-muted-foreground">
            Showing page {page} of {totalPages}
            {typeof pagination.total === "number" &&
              ` · ${pagination.total} items`}
          </p>
          <div className="flex items-center gap-3">
            <Select
              value={String(limit)}
              onValueChange={(value) => updateUrl(1, Number(value))}
            >
              <SelectTrigger className="h-8 w-16">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="lg"
              disabled={page <= 1}
              onClick={() => updateUrl(page - 1, limit)}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">Prev</span>
            </Button>
            <Button
              variant="outline"
              size="lg"
              disabled={page >= totalPages}
              onClick={() => updateUrl(page + 1, limit)}
            >
              <span className="ml-1 hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
