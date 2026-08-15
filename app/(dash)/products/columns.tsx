"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";
import { formatStatus } from "@/components/atoms/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  Edit3,
  Eye,
  LucideArrowRight,
  LucideGlobe,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { getFullImageUrl } from "@/lib/getFullImageUrl";
import Link from "next/link";

export function createColumns(
  onDelete?: (id: string) => void,
  slugSort?: "asc" | "desc" | null,
  onToggleSlugSort?: () => void,
): ColumnDef<any>[] {
  return [
  {
    accessorKey: "id",
    header: "SN",
    cell: ({ row }) => {
      return (
        <div className="flex items-center justify-center">{row.index + 1}</div>
      );
    },
  },
  {
    accessorKey: "thumbnail",
    header: "Image",
    cell: ({ row }) => {
      return (
        <div>
          {row?.original?.thumbnail ? (
            <img
              alt=""
              className="size-16 object-cover"
              src={getFullImageUrl(row?.original?.thumbnail)}
            />
          ) : (
            <div className="size-16 border"> </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => {
      return (
        <div className="flex gap-1 items-center">
            <p> {row.original.title.substring(0, 25) + "..."}</p>
        </div>
      );
    },
  },
  {
    accessorKey: "slug",
    cell: ({ row }) => {
      return (<button id="slug-btn" onClick={() => {
        navigator.clipboard.writeText(row.original.slug);
        toast.success("Slug copied to clipboard.");
      }}>{row.original.slug }</button>)},
    header: ({ column }) => (
      <button
        type="button"
        onClick={onToggleSlugSort}
        className="flex items-center gap-1 font-medium"
      >
        Slug
        {slugSort === "asc" ? (
          <ChevronUp className="size-3.5" />
        ) : slugSort === "desc" ? (
          <ChevronDown className="size-3.5" />
        ) : (
          <ChevronsUpDown className="size-3.5 opacity-50" />
        )}
      </button>
    ),
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => {
      return <span>{row.original.category || "—"}</span>;
    },
  },
  {
    accessorKey: "price",
    header: () => <div className="text-left">Price</div>,
    cell: ({ row }) => {
      const price = Number.parseFloat(row.getValue("price"));
      const compareAt = Number.parseFloat(row.original.compareAtPrice);
      const maxPrice = Number.parseFloat(row.original.maxPrice);
      const format = (n: number) =>
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(n);

      if (!Number.isFinite(price)) return <div className="text-left">—</div>;

      return (
        <div className="text-left font-medium">
          {Number.isFinite(compareAt) && compareAt > 0 && (
            <span className="mr-1 text-muted-foreground line-through">
              {format(compareAt)}
            </span>
          )}
          {format(price)}
          {Number.isFinite(maxPrice) && maxPrice > price && (
            <span className="text-muted-foreground"> – {format(maxPrice)}</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status");
      return (
        <Badge
          variant={"outline"}
          className={cn(
            // @ts-expect-error it's unknown
            formatStatus(status)?.color ? formatStatus(status)?.color : "",
            "text-white",
          )}
        >
          {/* @ts-expect-error it's unknown */}
          {formatStatus(status)?.icon} {formatStatus(status)?.text}
        </Badge>
      );
    },
  },
  {
    accessorKey: "isFeatured",
    header: "Featured",
    cell: ({ row }) => {
      return row.original.isFeatured ? (
        <Badge variant="secondary">Featured</Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  },
  {
    accessorKey: "updatedAt",
    header: "Updated",
    cell: ({ row }) => {
      return row.original.updatedAt
        ? new Date(row.original.updatedAt).toLocaleDateString()
        : "—";
    },
  },
  {
    id: "actions",
    cell: function ActionCell({ row }) {
      const [showDeleteDialog, setShowDeleteDialog] = useState(false);
      const router = useRouter();

      const deleteItem = async (id: string) => {
        const response = await fetch(
          `/api/products/${id}`,
          {
            method: "DELETE",
            credentials: "include",
          },
        );

        const data = await response.json().catch(() => null);

        if (response.ok) {
          toast.success("Item deleted Successfully!");
          onDelete?.(id);
        } else {
          toast.error(data?.message || "Something went wrong!");
        }
      };

      const setStatus = async (id: string, status: "DRAFT" | "PUBLISHED") => {
        const response = await fetch(`/api/products/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status }),
        });

        const data = await response.json().catch(() => null);

        if (response.ok) {
          toast.success(data?.message || "Status updated successfully!");
          window.location.href = "/products";
        } else {
          toast.error(data?.message || "Something went wrong!");
        }
      };

      return (
        <Suspense fallback={<div>Loading...</div>}>
          <div className="flex items-center gap-1">
            <Button variant="ghost" asChild title="View Preview">
              <Link href={`/products/preview?id=${row.getValue("id")}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
            <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() =>
                  navigator.clipboard.writeText(row.getValue("id"))
                }
              >
                Copy Product ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  router.push(`/products/edit?id=${row.getValue("id")}`)
                }
              >
                  <Edit3 />
                  Edit Product
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setStatus(row.getValue("id"), "PUBLISHED")}
                disabled={row.original.status == "PUBLISHED"}
              >
                  <LucideGlobe />
                  Publish
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatus(row.getValue("id"), "DRAFT")} disabled={row.original.status == "DRAFT"}>
                  <LucideArrowRight />
                  Move to Drafts
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowDeleteDialog(true)}
                className="group flex gap-1 items-center  text-muted-foreground hover:text-rose-500"
                >
                  <Trash2 className="text-muted-foreground group-hover:text-rose-500" />
                  Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <AlertDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently remove
                  your data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    deleteItem(row.getValue("id"))
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          </div>
        </Suspense>
      );
    },
  },
];
}
