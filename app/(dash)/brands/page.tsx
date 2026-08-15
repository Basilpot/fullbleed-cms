"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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

type BrandForm = {
  name: string;
  slug: string;
  sortOrder: number;
  isFeatured: boolean;
};

export default function Brands() {
  const router = useRouter();

  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentBrandId, setCurrentBrandId] = useState<string | null>(null);

  const { register, handleSubmit, reset, control, setValue, watch } = useForm<BrandForm>({
    defaultValues: { name: "", slug: "", sortOrder: 0, isFeatured: false },
  });
  useSlugAutoFill(control, setValue, "name", "slug");
  const [brandLogo, setBrandLogo] = useState<{ url: string; mediaId?: string }>({ url: "" });

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/brands`, {
        cache: "no-store",
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setBrands(data?.brands ?? []);
    } catch {
      toast.error("Failed to load brands");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const openCreateDialog = () => {
    setIsEdit(false);
    setCurrentBrandId(null);
    reset({ name: "", slug: "", sortOrder: 0, isFeatured: false });
    setBrandLogo({ url: "" });
    setIsDialogOpen(true);
  };

  const openEditDialog = (brand: any) => {
    setIsEdit(true);
    setCurrentBrandId(String(brand.id));
    reset({
      name: brand.name,
      slug: brand.slug,
      sortOrder: brand.sortOrder ?? 0,
      isFeatured: brand.isFeatured ?? false,
    });
    setBrandLogo({ url: brand.logo ?? "" });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: BrandForm) => {
    const url = isEdit ? `/api/brands/${currentBrandId}` : `/api/brands`;
    const method = isEdit ? "PATCH" : "POST";

    const payload: any = {
      name: data.name,
      slug: data.slug,
      sortOrder: Number(data.sortOrder ?? 0),
      isFeatured: data.isFeatured ?? false,
    };
    if (brandLogo.url) payload.logo = brandLogo.url;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const resJson = await res.json();

    if (res.ok) {
      toast.success(
        resJson.message || (isEdit ? "Brand updated successfully!" : "Brand added successfully!"),
      );
      setIsDialogOpen(false);
      fetchBrands();
    } else {
      toast.error(resJson?.message || "Something went wrong!");
    }
  };

  const deleteBrand = async (id: string) => {
    const res = await fetch(`/api/brands/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const data = await res.json();
    if (res.ok) {
      toast.success(data?.message || "Brand deleted successfully!");
      fetchBrands();
    } else {
      toast.error(data?.message || "Something went wrong!");
    }
  };

  const brandColumns: ColumnDef<any>[] = [
    {
      header: "S.N",
      cell: ({ row }) => row.index + 1,
    },
    {
      header: "Logo",
      cell: ({ row }) =>
        row.original.logo && (
          <img
            src={getFullImageUrl(row.original.logo)}
            alt={row.original.name}
            className="h-10 w-10 object-contain rounded-md"
          />
        ),
    },
    {
      header: "Name",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    { accessorKey: "slug", header: "Slug" },
    {
      header: "Featured",
      cell: ({ row }) => (row.original.isFeatured ? "Yes" : "No"),
    },
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
              setCurrentBrandId(String(row.original.id));
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
          title="Brands"
          description="Brands your products belong to"
        >
          <Button size={"lg"} onClick={openCreateDialog}>
            <LucidePlus className="mr-2" size={18} />
            Add New Brand
          </Button>
        </PageHeader>
      </div>

      <DataTable
        columns={brandColumns}
        data={brands}
        isLoading={loading}
        emptyMessage="No brands yet."
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Edit Brand" : "Add New Brand"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {isEdit
                ? "Update the brand details."
                : "Add a new brand for your products."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
            <div className="space-y-2">
              <Label htmlFor="name">Brand Name</Label>
              <Input {...register("name")} type="text" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Brand Slug (Unique)</Label>
              <Input {...register("slug")} type="text" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input {...register("sortOrder", { setValueAs: (v) => Number(v) })} type="number" />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={watch("isFeatured") ?? false}
                onCheckedChange={(v) => setValue("isFeatured", v === true)}
                id="isFeatured"
              />
              <Label htmlFor="isFeatured">Featured brand</Label>
            </div>
            <div className="space-y-2">
              <Label>Brand Logo</Label>
              <ImageUpload
                value={brandLogo.url || null}
                onChange={(v) => setBrandLogo(v)}
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
              This will permanently delete the brand. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              variant="secondary"
              onClick={() => {
                if (currentBrandId) deleteBrand(currentBrandId);
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
