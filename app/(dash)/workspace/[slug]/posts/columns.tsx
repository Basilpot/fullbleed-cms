"use client";

import { ColumnDef } from "@tanstack/react-table";
import {
  Copy,
  Edit,
  LucideRefreshCcw,
  LucideTrash,
  MoreHorizontal,
  Trash,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";

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
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type PostCategory = {
  id: string;
  categoryName: string;
  categoryHandle: string;
};

type Post = {
  id: string;
  title: string;
  slug: string;
  content: string;
  coverImage: string;
  category: PostCategory;
  metaTitle: string;
  metaDescription: string;
  tags: string;
  published: boolean;
  publishedAt: string;
  updatedAt: string;
  authorId: number;
  inTrash: boolean;
  writer: {
    name: string;
    username: string;
  };
  author: {
    id: number;
    name: string;
    email: string;
  };
};

const deletePost = async (id: string) => {
  const response = await fetch(
    `/api/blogs/${id}`,
    {
      method: "DELETE",
      cache: "no-store",
    },
  );
  const data = await response.json();
  if (response.ok) {
    toast.success("Post moved to trash");
  } else {
    toast.error(
      data?.message ||
        "Something went wrong, please try again after some time!",
    );
  }
  return response.ok;
};
const permanentlyDeletePost = async (id: string) => {
  const res = await fetch(
    `/api/blogs/${id}?permanent=true`,
    {
      method: "DELETE",
      cache: "no-store",
    },
  );

  const data = await res.json();
  if (res.ok) {
    toast.success("Post permanently deleted");
  } else {
    toast.error(
      data?.message ||
        "Something went wrong, please try again after some time!",
    );
  }
  return res.ok;
};

const restorePost = async (id: string) => {
  const response = await fetch(
    `/api/blogs/restore/${id}`,
    {
      method: "PATCH",
      cache: "no-store",
      credentials: "include",
    },
  );

  const data = await response.json();

  if (response.ok) {
    toast.success("Post restored");
  } else {
    toast.error(
      data?.message ||
        "Something went wrong, please try again after some time!",
    );
  }
  return response.ok;
};

export const postsColumns = (slug: string, onChanged: () => void): ColumnDef<Post>[] => [
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
          alt={row.original.metaTitle}
        />
      ) : (
        <div className="size-24 border flex flex-col items-center justify-center p-2 text-center">
          No <br /> Image.{" "}
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
href={`/workspace/${slug}/posts/edit?slug=${row.original.slug}`}
          className="underline underline-offset-2"
        >
          {row.original.title.substring(0, 50) + "..."}
        </Link>
      );
    },
  },
  {
    accessorKey: "authorId",
    header: "Author",
    cell: ({ row }) => {
      return (
        <p> {row.original?.writer?.name ?? row.original.author?.name}</p>
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
  // {
  //   accessorKey: "slug",
  //   header: "Slug",
  //   cell: ({ row }) => {
  //     return (
  //       <Link
  //         className="flex gap-1 items-center text-primary-foreground bg-primary w-fit rounded-full py-0.5 px-2"
  //         href={`${process.env.NEXT_PUBLIC_WEBSITE_URL}/posts/${row.getValue("slug")}`}
  //       >
  //         <Tooltip>
  //           <TooltipTrigger className="flex gap-2 items-center">
  //             {/*// @ts-expect-error some type issues*/}
  //             {row.getValue("slug")?.substring(0, 25) + "..."}
  //             <LucideExternalLink className="size-4" />
  //           </TooltipTrigger>
  //           <TooltipContent>Visit Preview</TooltipContent>
  //         </Tooltip>
  //       </Link>
  //     );
  //   },
  // },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => {
      return <Badge variant={"secondary"}>{row.original.category?.categoryName}</Badge>;
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
    cell: ({ row }) => <PostActions post={row.original} slug={slug} onChanged={onChanged} />,
  },
];


function PostActions({ post, slug, onChanged }: { post: Post; slug: string; onChanged: () => void }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          {!post.inTrash && (
            <DropdownMenuItem
              className="group"
              onClick={() =>
                navigator.clipboard.writeText(
                  `${process.env.NEXT_PUBLIC_FRONTEND_BASE_URL}/${post.slug}`,
                )
              }
            >
              <Copy className="group-hover:text-accent-foreground" /> Copy Post URL
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {!post.inTrash && (
            <Link href={`/workspace/${slug}/posts/edit?slug=${post.slug}`}>
              <DropdownMenuItem className="group">
                <Edit className="group-hover:text-accent-foreground" /> Edit
              </DropdownMenuItem>
            </Link>
          )}
          {!post.inTrash && (
            <DropdownMenuItem
              className="group text-muted-foreground hover:text-red-500! hover:bg-red-200!"
              onClick={async () => {
                if (await deletePost(post.id)) onChanged();
              }}
            >
              <Trash className="group-hover:text-red-500" /> Move to trash
            </DropdownMenuItem>
          )}
          {post.inTrash && (
            <DropdownMenuItem
              className="text-muted-foreground hover:text-muted-foreground! hover:bg-muted!"
              onClick={async () => {
                if (await restorePost(post.id)) onChanged();
              }}
            >
              <LucideRefreshCcw /> Restore
            </DropdownMenuItem>
          )}
          {post.inTrash && (
            <DropdownMenuItem
              className="group text-muted-foreground hover:text-red-500! hover:bg-red-200!"
              onClick={() => setConfirming(true)}
            >
              <LucideTrash className="group-hover:text-red-500" /> Permanently
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Permanently delete “${post.title}”?`}
        description="The post and its tag links are removed for good. This cannot be undone."
        confirmLabel="Delete forever"
        pendingLabel="Deleting…"
        onConfirm={async () => {
          if (await permanentlyDeletePost(post.id)) onChanged();
        }}
      />
    </>
  );
}
