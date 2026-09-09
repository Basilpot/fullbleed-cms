"use client";

import { ColumnDef } from "@tanstack/react-table";
import {
  Copy,
  Edit,
  LucideExternalLink,
  MoreHorizontal,
  Trash,
} from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { getFullImageUrl } from "@/lib/getFullImageUrl";

type InfoPageCategory = {
  id: string;
  categoryHandle: string;
  categoryName: string | null;
};

type InfoPage = {
  id: string;
  title: string;
  slug: string | null;
  content: string;
  coverImage: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  published: boolean;
  updatedAt: string;
  createdAt: string;
  infoPageCategory: InfoPageCategory | null;
};

const deleteInfoPage = async (id: string) => {
  const response = await fetch(
    `/api/info-page/${id}`,
    {
      method: "DELETE",
      cache: "no-store",
    },
  );
  const data = await response.json();
  if (response.ok) {
    toast.success(data?.message || "Page deleted successfully");
  } else {
    toast.error(
      data?.message ||
        "Something went wrong, please try again after some time!",
    );
  }
};

export const infoPagesColumns = (slug: string): ColumnDef<InfoPage>[] => [
  {
    accessorKey: "id",
    header: "SN",
    cell: ({ row }) => {
      return <div className="text-center flex flex-col">{row.index + 1}</div>;
    },
  },
  {
    accessorKey: "coverImage",
    header: "",
    cell: ({ row }) => {
      return row.getValue("coverImage") ? (
        <Image
          height={100}
          width={100}
          className="min-w-12 size-12 object-cover"
          src={getFullImageUrl(row.getValue("coverImage"))}
          alt={row.original.metaTitle ?? row.original.title}
        />
      ) : (
        <div className="size-12 border flex flex-col items-center justify-center p-1 text-center text-xs">
          No Image
        </div>
      );
    },
  },
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => {
      return (
        <Link
          href={`/workspace/${slug}/services/edit?id=${row.original.id}`}
          className="underline underline-offset-2"
        >
          {row.original.title.substring(0, 50) + "..."}
        </Link>
      );
    },
  },
  {
    accessorKey: "slug",
    header: "Slug/URL",
    cell: ({ row }) => {
      return (
        <span onClick={() => navigator.clipboard.writeText(row.getValue("slug"))}>
          {row.getValue("slug")}
        </span>
      );
    },
  },
  {
    accessorKey: "infoPageCategory",
    header: "Category",
    cell: ({ row }) => {
      const cat = row.original.infoPageCategory;
      return cat ? (
        <Badge variant={"secondary"}>
          {cat.categoryName ?? cat.categoryHandle}
        </Badge>
      ) : (
        <span className="text-muted-foreground text-xs">—</span>
      );
    },
  },
  {
    accessorKey: "published",
    header: "Status",
    cell: ({ row }) => {
      return row.original.published ? (
        <Badge variant={"default"}>Published</Badge>
      ) : (
        <Badge variant={"outline"}>Draft</Badge>
      );
    },
  },
  {
    accessorKey: "updatedAt",
    header: "Last Modified",
    cell: ({ row }) => {
      return (
        <div>
          {new Date(row.getValue("updatedAt")).toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "2-digit",
          })}
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      const page = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() =>
                navigator.clipboard.writeText(
                  `${process.env.NEXT_PUBLIC_FRONTEND_BASE_URL}/info/${page.slug}`,
                )
              }
            >
              <Copy /> Copy Page URL
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <Link href={`/workspace/${slug}/services/edit?id=${page.id}`}>
              <DropdownMenuItem>
                <Edit /> Edit
              </DropdownMenuItem>
            </Link>
            <DropdownMenuItem
              className="text-muted-foreground hover:text-muted-foreground!"
              onClick={() => deleteInfoPage(page.id)}
            >
              <Trash /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
