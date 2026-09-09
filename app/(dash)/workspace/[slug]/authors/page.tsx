"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { PageHeader } from "@/components/page-header";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { Edit3, LucidePlus, Plus, Trash2Icon, X } from "lucide-react";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { DataTable } from "@/components/ui/data-table";
import { TPagination } from "@/app/(dash)/types/pagination";
import { getFullImageUrl } from "@/lib/getFullImageUrl";
import { MediaPicker } from "@/components/media-picker";

type Author = {
  id: string;
  name: string;
  email: string;
  image?: string;
  status?: string;
  username: string;
};

type AuthorForm = {
  username: string;
  name: string;
  email: string;
  password?: string;
  bio?: string;
};

export default function Authors() {
  const searchParams = useSearchParams();
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "10");

  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<TPagination>();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentAuthorId, setCurrentAuthorId] = useState<string | null>(null);
  const [currentAuthorUsername, setCurrentAuthorUsername] = useState<
    string | null
  >(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AuthorForm>();

  const fetchAuthors = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/authors?page=${page}&limit=${limit}`, {
        cache: "no-store",
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setAuthors(json?.data ?? []);
      setPagination(json?.pagination);
    } catch {
      toast.error("Failed to load authors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuthors();
  }, [page, limit]);

  const openCreateDialog = () => {
    setIsEdit(false);
    setCurrentAuthorId(null);
    setCurrentAuthorUsername(null);
    setPreview(null);
    reset({ username: "", name: "", email: "", password: "", bio: "" });
    setIsDialogOpen(true);
  };

  const openEditDialog = (author: Author) => {
    setIsEdit(true);
    setCurrentAuthorId(author.id);
    setCurrentAuthorUsername(author.username);
    reset({
      username: author.username,
      name: author.name,
      email: author.email,
      bio: "",
    });
    setPreview(author.image ?? null);

    fetch(`/api/authors/${author.username}`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data?.bio) setValue("bio", data.bio);
        if (data?.image) setPreview(data.image);
      })
      .catch(() => {});
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: AuthorForm) => {
    const payload = {
      username: data.username,
      name: data.name,
      email: data.email,
      bio: data.bio ?? "",
      image: preview || "",
      password: data.password || undefined,
    };

    const url = isEdit
      ? `/api/authors/update/${currentAuthorUsername}`
      : `/api/authors/create`;
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const resJson = await res.json().catch(() => null);

    if (res.ok) {
      toast.success(
        isEdit ? "Author updated successfully" : "Author added successfully",
      );
      setIsDialogOpen(false);
      fetchAuthors();
    } else {
      toast.error(resJson?.message || "Something went wrong");
    }
  };

  const deleteAuthor = async (id: string) => {
    const res = await fetch(`/api/authors/delete/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (res.ok) {
      toast.success("Author removed successfully");
      fetchAuthors();
    } else {
      toast.error("Failed to delete author. Try again later.");
    }
  };

  const authorColumns: ColumnDef<Author>[] = [
    {
      header: "S.N",
      cell: ({ row }) => row.index + 1,
    },
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
              unoptimized
            />
          ) : (
            <div className="h-10 w-10 rounded-sm border" />
          )}
          <button
            type="button"
            onClick={() => openEditDialog(row.original)}
            className="font-medium hover:underline cursor-pointer text-left"
          >
            {row.original.name}
          </button>
        </div>
      ),
    },
    { accessorKey: "email", header: "Email" },
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
        <div className="flex gap-4">
          <Button size="lg" onClick={() => openEditDialog(row.original)}>
            <Edit3 size={12} /> Edit
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => {
              setCurrentAuthorId(row.original.id);
              setIsDeleteDialogOpen(true);
            }}
          >
            <Trash2Icon size={12} /> Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <PageHeader
          title="Authors"
          description="Manage your authors here. Authors can post articles and informational contents."
        >
          <Button size="lg" onClick={openCreateDialog}>
            <LucidePlus className="mr-2" size={18} />
            Add New Author
          </Button>
        </PageHeader>
      </div>

      <DataTable
        columns={authorColumns}
        data={authors}
        isLoading={loading}
        pagination={pagination}
        emptyMessage="No authors found."
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Edit Author" : "Add New Author"}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update the author details."
                : "Create a new author."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="space-y-2">
              <Label>Profile Image</Label>
              {preview ? (
                <div className="relative w-32 h-32 border rounded-md overflow-hidden">
                  <Image
                    src={getFullImageUrl(preview)}
                    alt="Profile preview"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() => setPreview(null)}
                    className="absolute top-1 right-1 bg-primary/90 text-background rounded-full p-1 z-10"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="flex flex-col items-center justify-center w-32 h-32 border border-dashed rounded-md cursor-pointer text-muted-foreground hover:bg-primary/10 hover:text-foreground transition-colors shrink-0"
                >
                  <Plus className="h-5 w-5 mb-1" />
                  <span className="text-xs font-medium">Add Media</span>
                </button>
              )}
            </div>

            <div className="space-y-2">
              <Label>Name</Label>
              <Input {...register("name")} required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input {...register("username")} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  {...register("email", { required: "Email is required" })}
                  required
                />
              </div>
            </div>

            {!isEdit && (
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  {...register("password", {
                    required: "Password is required",
                    minLength: {
                      value: 8,
                      message: "Minimum 8 characters",
                    },
                  })}
                />
                {errors.password && (
                  <p className="text-sm text-red-500">
                    {errors.password.message}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea
                {...register("bio")}
                placeholder="Short bio"
                rows={3}
              />
            </div>

            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}

            <DialogFooter>
              <Button type="submit" size="lg" disabled={isSubmitting}>
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
                if (currentAuthorId) deleteAuthor(currentAuthorId);
                setIsDeleteDialogOpen(false);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MediaPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(media) => setPreview(media.url)}
      />
    </div>
  );
}