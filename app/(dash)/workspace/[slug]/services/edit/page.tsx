"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/image-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScanSearch } from "lucide-react";
import { useCallback, useEffect, useState, Suspense } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TipTapField } from "@/components/posts/tiptap-field";
import { generateSlug } from "@/lib/generateSlug";
import { useSlugAutoFill } from "@/lib/useSlugAutoFill";
import { useDraft } from "@/hooks/use-draft";
import { resolveMediaHtml } from "@/lib/resolve-media-html";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type InfoPageCategory = {
  id: string;
  categoryHandle: string;
  categoryName: string | null;
};

const InfoPageFormInner = () => {
  const [categories, setCategories] = useState<InfoPageCategory[]>([]);
  const [showSEOFields, setShowSEOFields] = useState(false);
  const [coverImage, setCoverImage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const { register, handleSubmit, reset, getValues, setValue, control, watch } =
    useForm({
      defaultValues: {
        title: "",
        slug: "",
        content: "",
        coverImage: "",
        metaTitle: "",
        metaDescription: "",
        published: false,
        infoPageCategoryId: "",
      },
    });

  useSlugAutoFill(control, setValue, "title", "slug");

  // ── Draft / auto-save ──────────────────────────────────────────────────────
  const draftKey = id ? `info-page-${id}` : "info-page-new";
  const draft = useDraft(draftKey, { getValues: () => getValues(), onRestore: (data) => reset(data) });

  useEffect(() => {
    const subscription = watch(() => draft.debouncedSave());
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch, draftKey]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/info-page/categories?limit=99`,
      );
      const data = await res.json();
      setCategories(data?.data?.categories ?? []);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  }, []);

  const fetchInfoPageData = useCallback(
    async (pageId: string) => {
      try {
        setIsLoading(true);
        const res = await fetch(
          `/api/info-page/${pageId}`,
        );
        if (!res.ok) throw new Error("Failed to fetch info page data");

        const data = await res.json();
        const infoPage = data.data?.infoPage;

        reset({
          title: infoPage.title ?? "",
          slug: infoPage.slug ?? "",
          content: infoPage.content ?? "",
          coverImage: infoPage.coverImage ?? "",
          metaTitle: infoPage.metaTitle ?? "",
          metaDescription: infoPage.metaDescription ?? "",
          published: infoPage.published ?? false,
          infoPageCategoryId: infoPage.infoPageCategoryId ?? "",
        });

        if (infoPage.coverImage) setCoverImage(infoPage.coverImage);
      } catch (error) {
        console.error("Failed to fetch info page:", error);
        toast.error("Failed to load info page data");
      } finally {
        setIsLoading(false);
      }
    },
    [reset],
  );

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (id) {
      fetchInfoPageData(id);
    }
  }, [id, fetchInfoPageData]);

  const onSubmit = async (data: any) => {
    try {
      setIsLoading(true);

      const enrichedContent = await resolveMediaHtml(data.content);

      const endpoint = id
        ? `/api/info-page/${id}`
        : `/api/info-page/`;
      const method = id ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          content: enrichedContent,
          coverImage,
          published: data.published,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || "Failed to save info page");
      }

      draft.clear();
      toast.success(
        id
          ? "Info page updated successfully!"
          : "Info page saved successfully!",
      );
      router.back();
    } catch (error: any) {
      console.error("Error saving info page:", error);
      toast.error(
        error.message || "Something went wrong while saving the page",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-xl">
            {id ? "Edit Info Page" : "Add New Info Page"}
          </h2>
          <div className="btn-group flex gap-1 justify-center items-center">
            <Button
              size="lg"
              variant="ghost"
              type="button"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" size="lg" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save"}
            </Button>
            <Button
              size="lg"
              variant="secondary"
              type="button"
              onClick={() => setShowSEOFields(true)}
            >
              <ScanSearch />
              SEO
            </Button>
          </div>
        </div>

        <ScrollArea className="h-screen py-4 pr-4">
          {/* SEO Fields */}
          <Sheet open={showSEOFields} onOpenChange={setShowSEOFields}>
            <SheetContent side="right" className="sm:max-w-md">
              <SheetHeader>
                <SheetTitle>SEO Configuration</SheetTitle>
                <SheetDescription>
                  Optimize how this page appears in search results.
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-4 p-4 overflow-y-auto">
                <ImageUpload
                  label="Cover Image (Featured)"
                  value={coverImage}
                  onChange={(v) => setCoverImage(v.url)}
                />
                <div className="flex flex-col gap-1">
                  <Label htmlFor="metaTitle" className="font-bold text-sm">
                    Meta Title
                  </Label>
                  <Input {...register("metaTitle")} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="metaDescription" className="font-bold text-sm">
                    Meta Description
                  </Label>
                  <Input {...register("metaDescription")} />
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Title + Slug */}
          <div className="grid grid-cols-2 gap-1 w-full my-4">
            <div className="flex flex-col gap-1 w-full">
              <Label htmlFor="title" className="font-bold text-sm">
                Title
              </Label>
              <Input {...register("title")} />
            </div>

            <div className="flex flex-col gap-1 w-full">
              <Label htmlFor="slug" className="font-bold text-sm">
                Slug/URL
              </Label>
              <div className="flex gap-1 items-center">
                <Input {...register("slug")} />
                <Button
                  type="button"
                  onClick={() =>
                    setValue("slug", generateSlug(getValues("title")))
                  }
                >
                  Generate
                </Button>
              </div>
            </div>
          </div>

          {/* Category + Status */}
          <div className="grid grid-cols-2 gap-1 w-full my-4">
            <div className="flex flex-col gap-1 w-full">
              <Label htmlFor="infoPageCategoryId" className="font-bold text-sm">
                Category
              </Label>
              <Controller
                control={control}
                name="infoPageCategoryId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Categories</SelectLabel>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.categoryName ?? cat.categoryHandle}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Status Dropdown */}
            <div className="flex flex-col gap-1 w-full">
              <Label htmlFor="published" className="font-bold text-sm">
                Status
              </Label>
              <Controller
                control={control}
                name="published"
                render={({ field }) => (
                  <Select
                    value={field.value ? "true" : "false"}
                    onValueChange={(v) => field.onChange(v === "true")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Status</SelectLabel>
                        <SelectItem value="false">Draft</SelectItem>
                        <SelectItem value="true">Published</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Content */}
          <div>
            <Label htmlFor="content" className="font-bold text-sm">
              Content
            </Label>
            <TipTapField minHeight={400} name="content" control={control} />
          </div>
        </ScrollArea>
      </div>
    </form>
  );
};

export default function InfoPageForm() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <InfoPageFormInner />
    </Suspense>
  );
}
