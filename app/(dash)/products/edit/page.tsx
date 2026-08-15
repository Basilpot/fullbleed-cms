"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getFullImageUrl } from "@/lib/getFullImageUrl";
import { useProductStore, FIELD_LABELS } from "@/store/useProductStore";
import {
  GripVertical,
  LucideEdit2,
  LucideImage,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { Combobox } from "@/components/organisms/combo-box";
import { createProductSchema } from "@/lib/validationSchemas";
import { ProductStatus } from "@/app/(dash)/enums/productStatus.enum";
import { ProductFormData } from "@/app/(dash)/types/productFormData";
import { InstructionTooltip } from "@/components/atoms/instruction-tooltip";
import InfoCard from "@/components/atoms/info-card";
import LabelDescription from "@/components/atoms/label-description";
import ListBox from "@/components/atoms/list-box";
import { MultiSelect } from "@/components/organisms/multi-select";
import { TipTapField } from "@/components/posts/tiptap-field";
import { Checkbox } from "@/components/ui/checkbox";
import { generateSlug } from "@/lib/generateSlug";
import { useSlugAutoFill } from "@/lib/useSlugAutoFill";
import { MediaPicker } from "@/components/media-picker";
import { useDraft } from "@/hooks/use-draft";

const MAX_STEP = 7;

const STEP_FIELDS: Record<number, string[]> = {
  1: ["title", "slug", "description", "images", "videoIntro", "isFeatured", "status"],
  2: ["price", "maxPrice", "compareAtPrice"],
  3: ["variants"],
  4: ["attributes"],
  5: ["categoryId", "brandId", "tagIds"],
  6: ["faq"],
  7: ["metaTitle", "metaDescription", "metaKeywords", "metaRobots"],
};

function getFirstErrorStep(errors: Record<string, any>): number | null {
  for (let step = 1; step <= MAX_STEP; step++) {
    const fields = STEP_FIELDS[step] ?? [];
    const hasError = fields.some((field) => {
      const topKey = field.split(".")[0];
      return !!errors[topKey];
    });
    if (hasError) return step;
  }
  return null;
}

function getFieldStep(field: string): number | null {
  const topKey = field.split(".")[0];
  for (let step = 1; step <= MAX_STEP; step++) {
    const fields = STEP_FIELDS[step] ?? [];
    if (fields.includes(topKey)) return step;
  }
  return null;
}

const DragHandleContext = React.createContext<{
  attributes: any;
  listeners: any;
} | null>(null);

function SortableItem({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <DragHandleContext.Provider value={{ attributes, listeners }}>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(className, isDragging && "opacity-50")}
      >
        {children}
      </div>
    </DragHandleContext.Provider>
  );
}

function DragHandle({ children }: { children?: React.ReactNode }) {
  const ctx = React.useContext(DragHandleContext);
  if (!ctx) return null;
  const { attributes, listeners } = ctx;
  return (
    <button
      type="button"
      {...attributes}
      {...listeners}
      className="cursor-grab p-1 hover:bg-muted rounded"
    >
      {children || <GripVertical className="h-4 w-4 text-muted-foreground" />}
    </button>
  );
}

function flattenCategories(categories: any[], depth = 0): { value: string; label: string }[] {
  return categories.flatMap((cat: any) => [
    { value: cat.id, label: `${"\u00A0".repeat(depth * 3)}${cat.name}` },
    ...flattenCategories(cat.children ?? [], depth + 1),
  ]);
}

function ProductForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams?.get("id") || null;
  const currStep = useProductStore((s) => s.currentStep);
  const setStep = useProductStore((s) => s.setStep);
  const setStepErrors = useProductStore((s) => s.setStepErrors);

  const [isEditing, setIsEditing] = useState(false);
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);

  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);

  const [galleryPickerOpen, setGalleryPickerOpen] = useState(false);
  const [variantImagePicker, setVariantImagePicker] = useState<number | null>(null);

  const onInvalid = (errors: Record<string, any>) => {
    const firstStep = getFirstErrorStep(errors);
    if (firstStep !== null) {
      setStep(firstStep);
      toast.error(
        `Please fix the errors on step ${firstStep} before submitting.`,
      );
    } else {
      toast.error("Please fix all errors before submitting.");
    }
  };

  const {
    register,
    handleSubmit,
    control,
    trigger,
    reset,
    getValues,
    setValue,
    setError,
    watch,
    formState: { errors },
  } = useForm<ProductFormData>({
    mode: "onChange",
    // @ts-expect-error Types of parameters 'options' and 'options' are incompatible.
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      title: "",
      slug: "",
      description: "",
      images: [],
      price: null,
      maxPrice: null,
      compareAtPrice: null,
      videoIntro: "",
      isFeatured: false,
      status: ProductStatus.DRAFT,
      categoryId: null,
      brandId: null,
      tagIds: [],
      attributes: [{ name: "", value: "" }],
      variants: [
        { name: "", sku: "", price: 0, compareAtPrice: null, stock: 0, image: "", sortOrder: 1 },
      ],
      faq: [{ q: "", a: "" }],
      metaTitle: "",
      metaDescription: "",
      metaKeywords: "",
      metaRobots: "",
      sku: "",
      priceCurrency: "NPR",
      availability: "InStock",
    },
  });

  useSlugAutoFill(control, setValue, "title", "slug");

  const {
    fields: variantFields,
    append: addVariant,
    remove: removeVariant,
  } = useFieldArray({ control, name: "variants" });
  const {
    fields: attributeFields,
    append: addAttribute,
    remove: removeAttribute,
  } = useFieldArray({ control, name: "attributes" });
  const {
    fields: faqFields,
    append: addFaq,
    remove: removeFaq,
  } = useFieldArray({ control, name: "faq" });

  useEffect(() => {
    const stepFieldErrors: Record<number, string[]> = {};
    for (let step = 1; step <= MAX_STEP; step++) {
      const fields = STEP_FIELDS[step] ?? [];
      const bad = fields
        .map((field) => {
          const topKey = field.split(".")[0];
          return (errors as any)[topKey] ? topKey : null;
        })
        .filter(Boolean) as string[];
      if (bad.length) stepFieldErrors[step] = bad;
    }
    setStepErrors(stepFieldErrors);
  }, [errors, setStepErrors]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Fetch options
  useEffect(() => {
    (async () => {
      try {
        const [catRes, brandRes, tagRes] = await Promise.all([
          fetch("/api/categories", { credentials: "include", cache: "no-store" }),
          fetch("/api/brands", { credentials: "include", cache: "no-store" }),
          fetch("/api/tags?page=1&limit=100", { credentials: "include", cache: "no-store" }),
        ]);
        const catData = await catRes.json().catch(() => null);
        const brandData = await brandRes.json().catch(() => null);
        const tagData = await tagRes.json().catch(() => null);
        setCategories(catData?.categories ?? []);
        setBrands(brandData?.brands ?? []);
        setTags(tagData?.data?.tags ?? []);
      } catch (e) {
        console.error("Failed to fetch options", e);
      }
    })();
  }, []);

  const categoryOptions = flattenCategories(categories);
  const brandOptions = brands.map((b) => ({ value: String(b.id), label: b.name }));
  const tagOptions = tags.map((t) => ({ value: t.id, label: t.name }));
  const statusOptions = Object.values(ProductStatus).map((s) => ({
    value: s,
    label: s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(),
  }));
  const availabilityOptions = ["InStock", "OutOfStock", "PreOrder", "BackOrder"].map((s) => ({
    value: s,
    label: s,
  }));

  // Edit mode
  useEffect(() => {
    if (!editId) return;
    setIsLoadingEdit(true);
    (async () => {
      try {
        const res = await fetch(`/api/products/by-id/${editId}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to fetch product");
        const product = (await res.json()).data;
        const toNullableNumber = (v: any) =>
          v == null || Number.isNaN(Number(v)) ? null : Number(v);
        const mapped: Partial<ProductFormData> = {
          title: product.title ?? "",
          slug: product.slug ?? "",
          description: product.description ?? "",
          images: Array.isArray(product.images) ? product.images : [],
          price: toNullableNumber(product.price),
          maxPrice: toNullableNumber(product.maxPrice),
          compareAtPrice: toNullableNumber(product.compareAtPrice),
          videoIntro: product.videoIntro ?? "",
          isFeatured: product.isFeatured ?? false,
          status: product.status ?? ProductStatus.DRAFT,
          categoryId: product.category?.id ?? null,
          brandId: product.brand?.id ?? null,
          tagIds: Array.isArray(product.tags) ? product.tags.map((t: any) => t.id) : [],
          attributes: Array.isArray(product.attributes)
            ? product.attributes.map((a: any) => ({ name: a.name ?? "", value: a.value ?? "" }))
            : [{ name: "", value: "" }],
          faq: (() => {
            if (!Array.isArray(product.faq)) return [{ q: "", a: "" }];
            return product.faq.flatMap((f: any) => {
              if (f?.q !== undefined) return [{ q: f.q ?? "", a: f.a ?? "" }];
              if (Array.isArray(f?.items)) return f.items.map((i: any) => ({ q: i.q ?? "", a: i.a ?? "" }));
              return [];
            });
          })(),
          variants: Array.isArray(product.variants)
            ? product.variants.map((v: any, i: number) => ({
                name: v.name ?? "",
                sku: v.sku ?? "",
                price: toNullableNumber(v.price) ?? 0,
                compareAtPrice: toNullableNumber(v.compareAtPrice),
                stock: toNullableNumber(v.stock) ?? 0,
                image: v.image ?? "",
                sortOrder: v.sortOrder ?? i + 1,
              }))
            : [],
          metaTitle: product.metaTitle ?? "",
          metaDescription: product.metaDescription ?? "",
          metaKeywords: product.metaKeywords ?? "",
          metaRobots: product.metaRobots ?? "",
          sku: product.sku ?? "",
          priceCurrency: product.priceCurrency ?? "NPR",
          availability: product.availability ?? "InStock",
        };
        reset(mapped as ProductFormData);
        setIsEditing(true);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingEdit(false);
      }
    })();
  }, [editId, reset]);

  // ── Draft / auto-save ──────────────────────────────────────────────────────
  const draftKey = editId ? `product-${editId}` : "product-new";
  const draft = useDraft(draftKey, {
    getValues: () => getValues(),
    onRestore: editId ? undefined : (data) => reset(data),
  });

  useEffect(() => {
    const subscription = watch(() => draft.debouncedSave());
    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch, draftKey]);

  const images = watch("images") ?? [];
  const renderedPreviews = useMemo(
    () => images.map((url) => getFullImageUrl(url)),
    [images],
  );

  const handleImageDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = images.findIndex((url) => url === active.id);
      const newIndex = images.findIndex((url) => url === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        setValue("images", arrayMove(images, oldIndex, newIndex));
      }
    }
  };

  const handleNextStep = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const stepFields = STEP_FIELDS[currStep] || [];
    const isStepValid = await trigger(stepFields as any, { shouldFocus: true });
    if (!isStepValid) {
      const result = createProductSchema
        .pick(stepFields as any)
        .safeParse(getValues());
      const msgs = result.success
        ? []
        : result.error.issues.map(
            (issue) =>
              `${FIELD_LABELS[String(issue.path[0])] ?? issue.path[0]}: ${issue.message}`,
          );
      if (msgs.length) toast.error(msgs.slice(0, 3).join(" · "));
      return;
    }
    if (currStep < MAX_STEP) setStep(currStep + 1);
  };

  const handlePrevStep = () => {
    if (currStep > 1) setStep(currStep - 1);
  };

  const resetProductForm = useCallback(() => {
    reset();
    setIsEditing(false);
    setStep(1);
  }, [reset, setStep]);

  const { clear: clearDraft } = draft;

  useEffect(() => {
    const onCancel = () => {
      clearDraft();
      resetProductForm();
      router.back();
    };
    window.addEventListener("product-form:cancel", onCancel);
    return () => window.removeEventListener("product-form:cancel", onCancel);
  }, [clearDraft, resetProductForm, router]);

  const onSubmit = async (data: ProductFormData) => {
    const priceOrNull = (v: number | null | undefined) =>
      v == null || Number.isNaN(Number(v)) ? null : Number(v);

    const payload = {
      title: data.title,
      slug: data.slug || generateSlug(data.title),
      description: data.description || null,
      price: priceOrNull(data.price),
      maxPrice: priceOrNull(data.maxPrice),
      compareAtPrice: priceOrNull(data.compareAtPrice),
      videoIntro: data.videoIntro || null,
      images: images,
      attributes: (data.attributes || []).filter(
        (a) => (a.name || "").trim() || (a.value || "").trim(),
      ),
      faq: (data.faq || []).filter((f) => (f.q || "").trim() || (f.a || "").trim()),
      isFeatured: !!data.isFeatured,
      status: data.status || ProductStatus.DRAFT,
      categoryId: data.categoryId || null,
      brandId: data.brandId ?? null,
      tagIds: data.tagIds ?? [],
      variants: (data.variants || [])
        .filter(
          (v) =>
            (v.name || "").trim() ||
            (v.sku || "").trim() ||
            Number(v.price) > 0 ||
            Number(v.stock) > 0,
        )
        .map((v, i) => ({
          name: v.name,
          sku: v.sku || null,
          price: priceOrNull(v.price) ?? 0,
          compareAtPrice: priceOrNull(v.compareAtPrice),
          stock: Number(v.stock) || 0,
          image: v.image || null,
          sortOrder: Number(v.sortOrder) || i + 1,
        })),
      metaTitle: data.metaTitle || null,
      metaDescription: data.metaDescription || null,
      metaKeywords: data.metaKeywords || null,
      metaRobots: data.metaRobots || null,
      sku: data.sku || null,
      priceCurrency: data.priceCurrency || "NPR",
      availability: data.availability || "InStock",
    };

    try {
      const endpoint = editId
        ? `/api/products/${editId}`
        : `/api/products`;

      const res = await fetch(endpoint, {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const fieldErrors: Array<{ field: string; message: string }> =
          body?.errors ?? [];
        if (fieldErrors.length > 0) {
          let firstStep: number | null = null;
          for (const { field, message } of fieldErrors) {
            setError(field as any, { type: "server", message });
            const step = getFieldStep(field);
            if (step !== null && (firstStep === null || step < firstStep)) {
              firstStep = step;
            }
          }
          if (firstStep !== null) setStep(firstStep);
          const msgs = fieldErrors.map(({ field, message }) => {
            const topKey = field.split(".")[0];
            return `${FIELD_LABELS[topKey] ?? topKey}: ${message}`;
          });
          toast.error(
            msgs.length
              ? msgs.slice(0, 3).join(" · ")
              : firstStep !== null
                ? `Please fix the errors on step ${firstStep}.`
                : "Please fix the highlighted errors.",
          );
          return;
        }
        const details = body?.message || body?.error || "Submission failed";
        throw new Error(details);
      }
      toast.success(
        editId ? "Product updated successfully" : "Product created successfully",
      );
      draft.clear();
      router.back();
    } catch (err) {
      toast.error((err as any)?.message || "Submission failed");
      console.error(err);
    }
  };

  return (
    <form
      id="productform"
      // @ts-expect-error some error on onsubmit type errors
      onSubmit={handleSubmit(onSubmit, onInvalid)}
      className="space-y-4"
    >
      {isLoadingEdit && (
        <div className="text-sm text-muted-foreground">Loading product...</div>
      )}

      {/* STEP 1: BASIC INFO */}
      {currStep === 1 && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Product Title</Label>
            <Input
              {...register("title", { required: "Title is required" })}
              placeholder="Short, descriptive product name (e.g., Organic Cotton Tee)"
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="slug">Slug</Label>
            <LabelDescription text="Keep it short, in kebab-case e.g. organic-cotton-tee" />
            <div className="flex gap-1 items-center">
              <Input
                {...register("slug")}
                placeholder="product-title-slug"
              />
              <Button
                type="button"
                onClick={() => setValue("slug", generateSlug(getValues("title")))}
              >
                Generate from Title
              </Button>
            </div>
            {errors.slug && (
              <p className="text-sm text-red-500">{errors?.slug?.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex gap-2 items-center">
              <Label htmlFor="description">Description</Label>
              <InstructionTooltip instruction="Rich product description. Mention materials, fit, use cases, and selling points." />
            </div>
            <TipTapField name="description" control={control} />
            {errors.description && (
              <p className="text-sm text-red-500">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex gap-1 items-center">
              <Label htmlFor="images">Gallery</Label>
              <InstructionTooltip instruction="First image is the listing thumbnail. Drag to reorder." />
            </div>
            {renderedPreviews.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleImageDragEnd}
              >
                <SortableContext items={images} strategy={rectSortingStrategy}>
                  <div className="flex flex-wrap gap-3 mt-2">
                    {renderedPreviews.map((fullUrl, idx) => (
                      <SortableItem
                        key={images[idx]}
                        id={images[idx]}
                        className="relative w-32 h-32 border rounded-md overflow-hidden"
                      >
                        <span className="absolute top-1 left-2 z-10">
                          <DragHandle>
                            <span className="flex items-center justify-center bg-white/90 rounded-sm p-0.5">
                              <GripVertical className="h-3 w-3 text-muted-foreground" />
                            </span>
                          </DragHandle>
                        </span>
                        <Image
                          fill
                          src={fullUrl}
                          alt={`preview-${idx}`}
                          className="object-cover"
                          unoptimized
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setValue("images", images.filter((_, i) => i !== idx))
                          }
                          className="absolute top-1 right-1 bg-primary/90 text-background rounded-full p-1 z-10"
                        >
                          <X size={14} />
                        </button>
                      </SortableItem>
                    ))}
                    <button
                      type="button"
                      onClick={() => setGalleryPickerOpen(true)}
                      className="flex flex-col items-center justify-center w-32 h-32 border border-dashed rounded-md cursor-pointer text-muted-foreground hover:bg-primary/10 hover:text-foreground transition-colors shrink-0"
                    >
                      <Plus className="h-5 w-5 mb-1" />
                      <span className="text-xs font-medium">Add Media</span>
                    </button>
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <button type="button" onClick={() => setGalleryPickerOpen(true)} className="max-w-4xl hover:bg-primary/10 rounded-sm border border-dashed p-8 flex flex-col items-center justify-center cursor-pointer">
                <Upload className="h-6 w-6 mb-2" />
                <p className="font-medium">Browse</p>
                <p className="text-sm text-foreground">Select from the media library or upload new images</p>
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="status">Status</Label>
            <Combobox
              options={statusOptions}
              value={watch("status")}
              setValue={(v: string) => setValue("status", v as any)}
              placeholder="Select status"
              notFoundPlaceholder="No status found."
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="isFeatured"
              checked={watch("isFeatured")}
              onCheckedChange={(checked) =>
                setValue("isFeatured", checked === true)
              }
            />
            <Label htmlFor="isFeatured">Featured product</Label>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex gap-1 items-center">
              <Label htmlFor="videoIntro">Video Intro (Optional)</Label>
              <InstructionTooltip instruction="Paste a YouTube or Vimeo embed URL/code to show a video on the product page." />
            </div>
            <Input
              {...register("videoIntro")}
              placeholder="https://www.youtube.com/embed/..."
            />
            {errors.videoIntro && (
              <p className="text-sm text-red-500">
                {errors.videoIntro.message}
              </p>
            )}
          </div>
        </div>
      )}

      {/* STEP 2: PRICING */}
      {currStep === 2 && (
        <div className="flex flex-col gap-3">
          <ListBox
            list={[
              "Set the base price, an optional max price for price ranges, and a compare-at price for discounts.",
              "When variants have prices, the storefront shows the lowest variant price.",
            ]}
          />
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="price">Price (USD)</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                {...register("price", {
                  setValueAs: (v: string) => (v === "" ? null : Number(v)),
                })}
                placeholder="Enter price"
              />
              {errors.price && (
                <p className="text-sm text-red-500">{errors.price.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="maxPrice">Max Price (USD)</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                {...register("maxPrice", {
                  setValueAs: (v: string) => (v === "" ? null : Number(v)),
                })}
                placeholder="Optional, for price ranges"
              />
              {errors.maxPrice && (
                <p className="text-sm text-red-500">{errors.maxPrice.message}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="compareAtPrice">Compare-at Price (USD)</Label>
            <LabelDescription text="Shown struck-through next to the price, e.g. original retail price." />
            <Input
              type="number"
              step="0.01"
              min={0}
              {...register("compareAtPrice", {
                setValueAs: (v: string) => (v === "" ? null : Number(v)),
              })}
              placeholder="Optional"
            />
            {errors.compareAtPrice && (
              <p className="text-sm text-red-500">
                {errors.compareAtPrice.message}
              </p>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: VARIANTS */}
      {currStep === 3 && (
        <div className="flex flex-col gap-3">
          <ListBox
            list={[
              "Variants are options like size or color, each with its own SKU and price.",
              "Product price is derived from the lowest variant price when no price is set.",
              "Set stock to manage inventory per variant.",
            ]}
          />
          <div className="space-y-3">
            {variantFields.map((field, index) => (
              <div key={field.id} className="p-4 border rounded-sm space-y-3 bg-muted/20">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-sm font-medium">Variant {index + 1}</span>
                  {variantFields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeVariant(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label>Name</Label>
                    <Input
                      {...register(`variants.${index}.name`)}
                      placeholder="e.g. Large, Black"
                    />
                    {errors.variants?.[index]?.name && (
                      <p className="text-sm text-red-500">
                        {errors.variants[index].name?.message}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>SKU</Label>
                    <Input
                      {...register(`variants.${index}.sku`)}
                      placeholder="e.g. TEE-BLK-L"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Price (USD)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      {...register(`variants.${index}.price`, {
                        setValueAs: (v: string) => (v === "" ? 0 : Number(v)),
                      })}
                    />
                    {errors.variants?.[index]?.price && (
                      <p className="text-sm text-red-500">
                        {errors.variants[index].price?.message}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Compare-at Price (USD)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      {...register(`variants.${index}.compareAtPrice`, {
                        setValueAs: (v: string) => (v === "" ? null : Number(v)),
                      })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Stock</Label>
                    <Input
                      type="number"
                      min={0}
                      {...register(`variants.${index}.stock`, {
                        setValueAs: (v: string) => (v === "" ? 0 : Number(v)),
                      })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Sort Order</Label>
                    <Input
                      type="number"
                      {...register(`variants.${index}.sortOrder`, {
                        setValueAs: (v: string) => (v === "" ? 0 : Number(v)),
                      })}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Image</Label>
                  {watch(`variants.${index}.image`) ? (
                    <div className="relative w-fit">
                      <Image
                        src={getFullImageUrl(watch(`variants.${index}.image`) ?? "")}
                        alt=""
                        width={96}
                        height={96}
                        className="object-cover rounded-sm border"
                        unoptimized
                      />
                      <Button
                        size={"icon-sm"}
                        className="absolute bottom-1 right-1"
                        type="button"
                        onClick={() => setVariantImagePicker(index)}
                      >
                        <LucideEdit2 />
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setVariantImagePicker(index)}
                      className="size-24 bg-accent p-2 rounded-sm flex items-center justify-center cursor-pointer border-dotted border-2 hover:bg-accent/70 transition-colors"
                    >
                      <LucideImage />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                addVariant({ name: "", sku: "", price: 0, compareAtPrice: null, stock: 0, image: "", sortOrder: variantFields.length + 1 })
              }
              className="rounded-full flex items-center gap-2"
            >
              <Plus className="size-4" /> Add Variant
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: ATTRIBUTES */}
      {currStep === 4 && (
        <div className="flex flex-col gap-3">
          <ListBox
            list={[
              "Attributes are key/value pairs like Material: Cotton or Fit: Slim.",
              "Useful for filtering and spec tables on the storefront.",
            ]}
          />
          <div className="space-y-3">
            {attributeFields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-[1fr_1fr_auto] gap-3 items-start">
                <div className="flex flex-col gap-1.5">
                  <Input
                    {...register(`attributes.${index}.name`)}
                    placeholder="Attribute name (e.g. Material)"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Input
                    {...register(`attributes.${index}.value`)}
                    placeholder="Value (e.g. Cotton)"
                  />
                </div>
                {attributeFields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAttribute(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => addAttribute({ name: "", value: "" })}
              className="rounded-full flex items-center gap-2"
            >
              <Plus className="size-4" /> Add Attribute
            </Button>
          </div>
        </div>
      )}

      {/* STEP 5: CATEGORIZATION */}
      {currStep === 5 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-8">
            <div className="flex flex-col gap-2 w-full">
              <Label htmlFor="category">Category</Label>
              <Combobox
                options={categoryOptions}
                value={watch("categoryId") ?? ""}
                setValue={(v: string) => setValue("categoryId", v || null)}
                placeholder="Select Category"
                notFoundPlaceholder="No category found."
              />
            </div>
            <div className="flex flex-col gap-2 w-full">
              <Label htmlFor="brand">Brand</Label>
              <Combobox
                options={brandOptions}
                value={watch("brandId") != null ? String(watch("brandId")) : ""}
                setValue={(v: string) => setValue("brandId", v ? Number(v) : null)}
                placeholder="Select Brand"
                notFoundPlaceholder="No brand found."
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="tagIds">Tags</Label>
            <LabelDescription text="Select tags for this product so it can be discovered in curated collections and themed browsing." />
            <MultiSelect
              options={tagOptions}
              selected={watch("tagIds") ?? []}
              onChange={(values) => setValue("tagIds", values)}
              placeholder="Select Tags"
              className="w-full"
            />
          </div>
          <InfoCard info="Manage categories, brands, and tags from their own pages in the sidebar." />
        </div>
      )}

      {/* STEP 7: SEO */}
      {currStep === 7 && (
        <div className="flex flex-col gap-2 p-2">
          <div className="flex flex-col gap-2">
            <div className="flex gap-1 items-center">
              <Label htmlFor="metaTitle">Meta Title</Label>
              <InstructionTooltip instruction="The main title shown on Google search results and browser tabs." />
            </div>
            <LabelDescription text="Keep it 50–60 characters and include your primary keyword." />
            <Input
              {...register("metaTitle")}
              placeholder="Organic Cotton Tee | Sustainable T-Shirts"
            />
            {errors.metaTitle && (
              <p className="text-sm text-red-500">
                {errors.metaTitle.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex gap-1 items-center">
              <Label htmlFor="metaDescription">Meta Description</Label>
              <InstructionTooltip instruction="A short summary shown under the title in search results." />
            </div>
            <LabelDescription text="Keep it 150–160 characters. Write it like an ad that encourages clicks." />
            <Textarea
              {...register("metaDescription")}
              placeholder="Comfortable organic cotton tees, ethically made and shipped worldwide."
            />
            {errors.metaDescription && (
              <p className="text-sm text-red-500">
                {errors.metaDescription.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex gap-1 items-center">
              <Label htmlFor="metaKeywords">Keywords</Label>
            </div>
            <LabelDescription text="Comma-separated keywords related to this product." />
            <Input
              {...register("metaKeywords")}
              placeholder="organic cotton, sustainable fashion, t-shirt"
            />
            {errors.metaKeywords && (
              <p className="text-sm text-red-500">
                {errors.metaKeywords.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex gap-1 items-center">
              <Label htmlFor="metaRobots">Robots</Label>
              <InstructionTooltip instruction="Indexing directive, e.g. index,follow or noindex,nofollow." />
            </div>
            <Input
              {...register("metaRobots")}
              placeholder="index, follow"
            />
            {errors.metaRobots && (
              <p className="text-sm text-red-500">
                {errors.metaRobots.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 mt-4">
            <div className="flex flex-col gap-1">
              <Label>Rich Results (Google Product)</Label>
              <LabelDescription text="These fields feed the Product structured data shown in Google search. Price and compare-at price are shared with the Pricing step." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="seoPrice">Price ({watch("priceCurrency") || "NPR"})</Label>
                <Input
                  id="seoPrice"
                  type="number"
                  step="0.01"
                  min={0}
                  {...register("price", {
                    setValueAs: (v: string) => (v === "" ? null : Number(v)),
                  })}
                  placeholder="Enter price"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="seoCompareAt">Compare-at Price ({watch("priceCurrency") || "NPR"})</Label>
                <Input
                  id="seoCompareAt"
                  type="number"
                  step="0.01"
                  min={0}
                  {...register("compareAtPrice", {
                    setValueAs: (v: string) => (v === "" ? null : Number(v)),
                  })}
                  placeholder="Optional"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="priceCurrency">Currency</Label>
                <Input
                  id="priceCurrency"
                  {...register("priceCurrency")}
                  placeholder="NPR"
                  maxLength={3}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  {...register("sku")}
                  placeholder="e.g. TEE-BLK-L"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="availability">Availability</Label>
                <Combobox
                  options={availabilityOptions}
                  value={watch("availability") ?? "InStock"}
                  setValue={(v: string) => setValue("availability", v)}
                  placeholder="Select availability"
                  notFoundPlaceholder="No availability found."
                />
              </div>
            </div>
            <InfoCard info="Google uses Product rich results to show price, stock status and reviews directly in search. Keep the currency a 3-letter ISO code (e.g. NPR, USD)." />
          </div>
        </div>
      )}

      {/* STEP 6: FAQ */}
      {currStep === 6 && (
        <div className="flex flex-col gap-4">
          <ListBox
            list={[
              "Answer common questions like sizing, shipping, returns, and materials.",
              "Each row is one question/answer pair.",
            ]}
          />
          {faqFields.map((field, index) => (
            <div key={field.id} className="p-4 border rounded-sm space-y-3 bg-muted/20">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-sm font-medium">FAQ {index + 1}</span>
                {faqFields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFaq(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Question</Label>
                <Input
                  {...register(`faq.${index}.q`)}
                  placeholder="e.g. How long does shipping take?"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Answer</Label>
                <Textarea
                  {...register(`faq.${index}.a`)}
                  placeholder="Write a clear answer..."
                  rows={4}
                />
              </div>
            </div>
          ))}
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => addFaq({ q: "", a: "" })}
              className="rounded-full flex items-center gap-2"
            >
              <Plus className="size-4" /> Add FAQ
            </Button>
          </div>
        </div>
      )}

      {/* NAVIGATION */}
      <div className="flex gap-2 w-full justify-end mt-12">
        <Button
          size="lg"
          type="button"
          onClick={handlePrevStep}
          disabled={currStep === 1}
          variant="outline"
        >
          Prev
        </Button>

        {currStep === MAX_STEP ? (
          <Button
            size={"lg"}
            type="submit"
            className="mr-4"
          >
            Finish
          </Button>
        ) : (
          <Button
            size="lg"
            type="button"
            onClick={(e) => handleNextStep(e)}
            className="mr-4"
          >
            Next
          </Button>
        )}
      </div>

      <MediaPicker
        open={galleryPickerOpen}
        onOpenChange={setGalleryPickerOpen}
        multiple
        onSelect={(media) => setValue("images", [...images, media.url])}
      />
      <MediaPicker
        open={variantImagePicker !== null}
        onOpenChange={(open) => {
          if (!open) setVariantImagePicker(null);
        }}
        onSelect={(media) => {
          if (variantImagePicker !== null) {
            setValue(`variants.${variantImagePicker}.image`, media.url);
          }
        }}
      />
    </form>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProductForm />
    </Suspense>
  );
}
