"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { useForm } from "react-hook-form";

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
import { ImageUpload } from "@/components/image-upload";
import { useSlugAutoFill } from "@/lib/useSlugAutoFill";
import { getFullImageUrl } from "@/lib/getFullImageUrl";

type CategoryForm = {
  name: string;
  slug: string;
  sortOrder: number;
  parentId: string;
};

type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  image?: string | null;
  sortOrder: number;
  parentId?: string | null;
  _count?: { products: number };
  children?: CategoryNode[];
};

function flattenTree(nodes: CategoryNode[], depth = 0): (CategoryNode & { depth: number })[] {
  const rows: (CategoryNode & { depth: number })[] = [];
  for (const node of nodes) {
    rows.push({ ...node, depth });
    if (node.children?.length) rows.push(...flattenTree(node.children, depth + 1));
  }
  return rows;
}

export default function Categories() {
  const router = useRouter();

  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentCatId, setCurrentCatId] = useState<string | null>(null);

  const { register, handleSubmit, reset, control, setValue } = useForm<CategoryForm>({
    defaultValues: { name: "", slug: "", sortOrder: 0, parentId: "" },
  });
  useSlugAutoFill(control, setValue, "name", "slug");
  const [categoryImage, setCategoryImage] = useState<{ url: string; mediaId?: string }>({ url: "" });

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/categories`, {
        cache: "no-store",
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCategories(data?.categories ?? []);
    } catch {
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const flatRows = useMemo(() => flattenTree(categories), [categories]);

  const openCreateDialog = () => {
    setIsEdit(false);
    setCurrentCatId(null);
    reset({ name: "", slug: "", sortOrder: 0, parentId: "" });
    setCategoryImage({ url: "" });
    setIsDialogOpen(true);
  };

  const openEditDialog = (category: CategoryNode) => {
    setIsEdit(true);
    setCurrentCatId(category.id);
    reset({
      name: category.name,
      slug: category.slug,
      sortOrder: category.sortOrder ?? 0,
      parentId: category.parentId ?? "",
    });
    setCategoryImage({ url: category.image ?? "" });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: CategoryForm) => {
    const url = isEdit ? `/api/categories/${currentCatId}` : `/api/categories`;
    const method = isEdit ? "PATCH" : "POST";

    const payload: any = {
      name: data.name,
      slug: data.slug,
      sortOrder: Number(data.sortOrder ?? 0),
      parentId: data.parentId || null,
    };
    if (categoryImage.url) payload.image = categoryImage.url;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const resJson = await res.json();

    if (res.ok) {
      toast.success(
        resJson.message || (isEdit ? "Category updated successfully!" : "Category added successfully!"),
      );
      setIsDialogOpen(false);
      fetchCategories();
    } else {
      toast.error(resJson?.message || "Something went wrong!");
    }
  };

  const deleteCategory = async (id: string) => {
    const res = await fetch(`/api/categories/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const data = await res.json();
    if (res.ok) {
      toast.success(data?.message || "Category deleted successfully!");
      fetchCategories();
    } else {
      toast.error(data?.message || "Something went wrong!");
    }
  };

  const parentOptions = useMemo(
    () => flatRows.filter((c) => c.id !== currentCatId),
    [flatRows, currentCatId],
  );

  const categoryColumns: ColumnDef<any>[] = [
    {
      header: "S.N",
      cell: ({ row }) => row.index + 1,
    },
    {
      header: "Image",
      cell: ({ row }) =>
        row.original.image && (
          <img
            src={getFullImageUrl(row.original.image)}
            alt={row.original.name}
            className="h-10 w-10 object-cover rounded-md"
          />
        ),
    },
    {
      header: "Name",
      cell: ({ row }) => (
        <span className="font-medium" style={{ paddingLeft: row.original.depth * 16 }}>
          {row.original.depth > 0 && "— "}
          {row.original.name}
        </span>
      ),
    },
    { accessorKey: "slug", header: "Slug" },
    {
      header: "Products",
      cell: ({ row }) => row.original._count?.products ?? 0,
    },
    {
      header: "Sort Order",
      cell: ({ row }) => row.original.sortOrder ?? 0,
    },
    {
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-4">
          <Button size={"lg"} onClick={() => openEditDialog(row.original)}>
            <Edit3 size={12} /> Edit
          </Button>
          <Button
            size={"lg"}
            variant="secondary"
            onClick={() => {
              setCurrentCatId(row.original.id);
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
          title="Categories"
          description="Categories that organize your products"
        >
          <Button size={"lg"} onClick={openCreateDialog}>
            <LucidePlus className="mr-2" size={18} />
            Add New Category
          </Button>
        </PageHeader>
      </div>

      <DataTable
        columns={categoryColumns}
        data={flatRows}
        isLoading={loading}
        emptyMessage="No categories yet."
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Edit Category" : "Add New Category"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {isEdit
                ? "Update the category details."
                : "Add a new category for grouping products."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
            <div className="space-y-2">
              <Label htmlFor="name">Category Name</Label>
              <Input {...register("name")} type="text" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Category Slug (Unique)</Label>
              <Input {...register("slug")} type="text" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parentId">Parent Category</Label>
              <select
                {...register("parentId")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">None (top level)</option>
                {parentOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {"\u00A0".repeat(c.depth * 2)}
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input {...register("sortOrder", { setValueAs: (v) => Number(v) })} type="number" />
            </div>
            <div className="space-y-2">
              <Label>Category Image</Label>
              <ImageUpload
                value={categoryImage.url || null}
                onChange={(v) => setCategoryImage(v)}
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

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader className="p-4">
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              This will permanently delete the category. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              variant="secondary"
              onClick={() => {
                if (currentCatId) deleteCategory(currentCatId);
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
