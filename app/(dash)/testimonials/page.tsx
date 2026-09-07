"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  Edit3,
  LucidePlus,
  Trash2Icon,
} from "lucide-react";

import { TPagination } from "@/app/(dash)/types/pagination";
import { ImageUpload } from "@/components/image-upload";
import { getFullImageUrl } from "@/lib/getFullImageUrl";

type Testimonial = {
  id: string;
  author: string;
  content: string;
  rating: number;
  media: string | null;
  createdAt: string;
};

type TestimonialFormValues = {
  author: string;
  content: string;
  rating: string;
};

export default function Testimonials() {
  const searchParams = useSearchParams();

  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentTestimonialId, setCurrentTestimonialId] = useState<
    string | null
  >(null);
  const [pagination, setPagination] = useState<TPagination>();
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "10");

  const { register, handleSubmit, reset } = useForm<TestimonialFormValues>({
    defaultValues: { author: "", content: "", rating: "" },
  });
  const [testimonialMedia, setTestimonialMedia] = useState<{
    url: string;
    mediaId?: string;
  }>({ url: "" });

  const fetchTestimonials = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/testimonials?page=${page}&limit=${limit}`,
        {
          cache: "no-store",
          credentials: "include",
        },
      );

      if (!res.ok) throw new Error();
      const data = await res.json();
      setTestimonials(data.data);
      setPagination(data.pagination);
    } catch {
      toast.error("Failed to load testimonials");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTestimonials();
  }, [page, limit, searchParams]);

  const openCreateDialog = () => {
    setIsEdit(false);
    setCurrentTestimonialId(null);
    reset({ author: "", content: "", rating: "" });
    setTestimonialMedia({ url: "" });
    setIsDialogOpen(true);
  };

  const openEditDialog = (testimonial: Testimonial) => {
    setIsEdit(true);
    setCurrentTestimonialId(testimonial.id);
    reset({
      author: testimonial.author,
      content: testimonial.content,
      rating: String(testimonial.rating),
    });
    setTestimonialMedia({ url: testimonial.media ?? "" });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: TestimonialFormValues) => {
    const url = isEdit
      ? `/api/testimonials/${currentTestimonialId}`
      : `/api/testimonials`;
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        ...data,
        rating: Number(data.rating),
        ...(testimonialMedia.url ? { media: testimonialMedia.url } : {}),
      }),
    });
    const resJson = await res.json();

    if (res.ok) {
      toast.success(
        resJson.message ||
          (isEdit
            ? "Testimonial updated successfully!"
            : "Testimonial added successfully!"),
      );
      setIsDialogOpen(false);
      fetchTestimonials();
    } else {
      toast.error(resJson?.message || "Something went wrong!");
    }
  };

  const deleteTestimonial = async (id: string) => {
    const res = await fetch(
      `/api/testimonials/${id}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      },
    );
    const data = await res.json();
    if (res.ok) {
      toast.success(data?.message || "Testimonial deleted successfully!");
      setTestimonials((prev) => prev.filter((t) => String(t.id) !== id));
    } else {
      toast.error(data?.message || "Something went wrong!");
    }
  };

  const columns: ColumnDef<Testimonial, unknown>[] = [
    {
      id: "sn",
      header: "S.N",
      cell: ({ row }) => (page - 1) * limit + row.index + 1,
    },
    {
      id: "media",
      header: "Media",
      cell: ({ row }) =>
        row.original.media ? (
          <img
            src={getFullImageUrl(row.original.media)}
            alt={row.original.author}
            className="h-10 w-10 object-cover rounded-md"
          />
        ) : null,
    },
    {
      id: "author",
      header: "Author",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => openEditDialog(row.original)}
          className="font-medium hover:underline cursor-pointer text-left"
        >
          {row.original.author}
        </button>
      ),
    },
    {
      id: "content",
      header: "Content",
      cell: ({ row }) => (
        <div className="max-w-xs truncate">{row.original.content}</div>
      ),
    },
    {
      id: "rating",
      header: "Rating",
      cell: ({ row }) => `${row.original.rating} / 5`,
    },
    {
      id: "createdAt",
      header: "Created At",
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const testimonial = row.original;
        return (
          <div className="flex gap-4">
            <Button size="lg" onClick={() => openEditDialog(testimonial)}>
              <Edit3 size={12} /> Edit
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => {
                setCurrentTestimonialId(testimonial.id);
                setIsDeleteDialogOpen(true);
              }}
            >
              <Trash2Icon size={12} /> Delete
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <PageHeader
          title="Testimonials"
          description="Manage your testimonials here."
        >
          <Button size="lg" onClick={openCreateDialog}>
            <LucidePlus className="mr-2" size={18} />
            Add New Testimonial
          </Button>
        </PageHeader>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={testimonials}
        pagination={pagination}
        isLoading={loading}
        emptyMessage="No testimonials found."
      />

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Edit Testimonial" : "Add New Testimonial"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {isEdit
                ? "Update the testimonial details."
                : "Add a new testimonial from a customer."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="author">Author</Label>
              <Input {...register("author")} type="text" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea {...register("content")} rows={4} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rating">Rating (1–5)</Label>
              <Input
                {...register("rating")}
                type="number"
                min={1}
                max={5}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Media</Label>
              <ImageUpload
                value={testimonialMedia.url || null}
                onChange={(v) => setTestimonialMedia(v)}
                label=""
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader className="p-4">
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              This will permanently delete the testimonial. This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              variant="secondary"
              onClick={() => {
                if (currentTestimonialId)
                  deleteTestimonial(currentTestimonialId);
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
