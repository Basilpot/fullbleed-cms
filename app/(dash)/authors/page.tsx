"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { LucideEdit3, LucidePlus, LucideTrash2 } from "lucide-react";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { DataTable } from "@/components/ui/data-table";
import { getFullImageUrl } from "@/lib/getFullImageUrl";

type Author = {
  id: string;
  name: string;
  email: string;
  image?: string;
  status?: string;
  username: string;
};

export default function Authors() {
  const searchParams = useSearchParams();
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "10");

  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [authorId, setAuthorId] = useState<string>("");
  const [pagination, setPagination] = useState<any>();

  const deleteAuthor = async () => {
    const res = await fetch(
      `/api/authors/delete/${authorId}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      },
    );

    if (!res.ok) {
      toast.error("Failed to delete author. Try again later.");
      return;
    }

    toast.success("Author removed successfully");
    setAuthors((prev) => prev.filter((a) => a.id !== authorId));
  };

  useEffect(() => {
    async function fetchAuthors() {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/authors?page=${page}&limit=${limit}`,
          { credentials: "include" },
        );
        if (!res.ok) throw new Error();
        const json = await res.json();
        setAuthors(json?.data ?? []);
        setPagination(json?.pagination);
      } catch {
        toast.error("Failed to load authors");
      } finally {
        setLoading(false);
      }
    }

    fetchAuthors();
  }, [page, limit]);

  const authorColumns: ColumnDef<Author>[] = [
    {
      header: "Author",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          {row.original.image ? (
            <Image
              src={getFullImageUrl(row.original.image)}
              width={40}
              height={40}
              alt={`${row.original.name}'s profile picture`}
              className="rounded-sm object-cover size-12"
            />
          ) : (
            <div className="h-10 w-10 rounded-sm border" />
          )}
        </div>
      ),
    },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "name", header: "Name" },
    {
      header: "Status",
      cell: ({ row }) =>
        row.original.status ?? (
          <Badge className="bg-green-700">Active</Badge>
        ),
    },
    {
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Link href={`/authors/create?authorId=${row.original.username}`}>
            <Button size="icon" variant="secondary" className="rounded-sm">
              <LucideEdit3 className="size-4" />
            </Button>
          </Link>

          <Button
            size="icon"
            variant="secondary"
            className="rounded-sm"
            onClick={() => {
              setAuthorId(row.original.id);
              setIsDeleteDialogOpen(true);
            }}
          >
            <LucideTrash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title="Authors"
          description="Manage your authors here. Authors can post articles and informational contents."
        >
          <Link href="/authors/create">
            <Button size="lg">
              <LucidePlus className="mr-2 size-4" />
              Add New Author
            </Button>
          </Link>
        </PageHeader>

        {/* Table */}
        <DataTable
          columns={authorColumns}
          data={authors}
          isLoading={loading}
          pagination={pagination}
          emptyMessage="No authors found."
        />
      </div>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This action is permanent and cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteAuthor();
                setIsDeleteDialogOpen(false);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
