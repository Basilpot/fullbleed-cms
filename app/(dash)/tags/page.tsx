"use client";

import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { PageHeader } from "@/components/page-header";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ColumnDef } from "@tanstack/react-table";

import { Edit3, LucidePlus, Trash2Icon } from "lucide-react";

import { DataTable } from "@/components/ui/data-table";
import { TPagination } from "@/app/(dash)/types/pagination";
import { TipTapField } from "@/components/posts/tiptap-field";
import { resolveMediaHtml } from "@/lib/resolve-media-html";
import { useSlugAutoFill } from "@/lib/useSlugAutoFill";

type TagForm = {
  name: string;
  slug: string;
  description?: string;
};

export default function Tags() {
  const searchParams = useSearchParams();

  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "10");
  const [pagination, setPagination] = useState<TPagination>();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentTagSlug, setCurrentTagSlug] = useState<string | null>(null);
  const [currentTagId, setCurrentTagId] = useState<string | null>(null);

  const { register, handleSubmit, reset, control, setValue } = useForm<TagForm>({
    defaultValues: {
      name: "",
      slug: "",
      description: "",
    },
  });

  useSlugAutoFill(control, setValue, "name", "slug");

  const fetchTags = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/tags?page=${page}&limit=${limit}`, {
        cache: "no-store",
        credentials: "include",
      });

      if (!res.ok) throw new Error();
      const data = await res.json();

      setTags(data?.data?.tags ?? []);
      setPagination(data?.data?.pagination);
    } catch {
      toast.error("Failed to load tags");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, [page, limit]);

  const openCreateDialog = () => {
    setIsEdit(false);
    setCurrentTagSlug(null);
    setCurrentTagId(null);
    reset({ name: "", slug: "", description: "" });
    setIsDialogOpen(true);
  };

  const openEditDialog = (tag: any) => {
    setIsEdit(true);
    setCurrentTagSlug(tag.slug);
    setCurrentTagId(tag.id);
    reset({
      name: tag.name,
      slug: tag.slug,
      description: tag.description ?? "",
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: TagForm) => {
    const url = isEdit ? `/api/tags/${currentTagSlug}` : `/api/tags`;
    const method = isEdit ? "PATCH" : "POST";

    const payload: any = {
      ...data,
      description: await resolveMediaHtml(data.description || ""),
    };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const resJson = await res.json();

    if (res.ok) {
      toast.success(
        isEdit ? "Tag updated successfully" : "Tag added successfully",
      );
      setIsDialogOpen(false);
      fetchTags();
    } else {
      toast.error(resJson?.message || "Something went wrong");
    }
  };

  const deleteTag = async (id: string) => {
    const res = await fetch(`/api/tags/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const data = await res.json();

    if (res.ok) {
      toast.success(data?.message || "Tag deleted");
      fetchTags();
    } else {
      toast.error(data?.message || "Something went wrong");
    }
  };

  const tagColumns: ColumnDef<any>[] = [
    {
      header: "S.N",
      cell: ({ row }) => row.index + 1,
    },
    {
      header: "Name",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    { accessorKey: "slug", header: "Slug" },
    {
      header: "Products",
      cell: ({ row }) => row.original._count?.products ?? 0,
    },
    {
      header: "Description",
      cell: ({ row }) => (
        <div className="max-w-xs truncate">
          {row.original.description ? (
            <div
              className="[&_p]:mb-0 [&_p]:inline"
              dangerouslySetInnerHTML={{
                __html: row.original.description,
              }}
            />
          ) : (
            "—"
          )}
        </div>
      ),
    },
    {
      header: "Created At",
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-4">
          <Button size="lg" onClick={() => openEditDialog(row.original)}>
            <Edit3 size={12} />
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => {
              setCurrentTagId(row.original.id);
              setIsDeleteDialogOpen(true);
            }}
          >
            <Trash2Icon size={12} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <PageHeader
          title="Tags"
          description="Curated tags that highlight products"
        >
          <Button size="lg" onClick={openCreateDialog}>
            <LucidePlus className="mr-2" size={18} />
            Add New Tag
          </Button>
        </PageHeader>
      </div>

      <DataTable
        columns={tagColumns}
        data={tags}
        isLoading={loading}
        pagination={pagination}
        emptyMessage="No tags yet."
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Edit Tag" : "Add New Tag"}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update the tag details."
                : "Create a new tag."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="space-y-2">
              <Label className="flex gap-4 items-center">Tag Name</Label>
              <Input {...register("name")} required />
            </div>

            <div className="space-y-2">
              <Label>Slug</Label>
              <Input {...register("slug")} required />
            </div>

            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <TipTapField
                control={control}
                name="description"
                placeholder="Add a description for this tag/section."
              />
            </div>

            <DialogFooter>
              <Button type="submit" size="lg">
                {isEdit ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              variant="secondary"
              onClick={() => {
                if (currentTagId) deleteTag(currentTagId);
                setIsDeleteDialogOpen(false);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
