import { ProductStatus } from "@/app/(dash)/enums/productStatus.enum";
import z from "zod";

const optionalNumber = z
  .union([z.number(), z.literal(""), z.null(), z.nan()])
  .transform((val) => {
    if (typeof val === "string" && val.trim() === "") return null;
    if (typeof val === "number" && !Number.isNaN(val)) return val;
    return null;
  })
  .catch(null)
  .nullable()
  .optional();

const rowNumber = (message: string) =>
  z
    .union([z.number(), z.literal(""), z.null()])
    .transform((val) => {
      if (typeof val === "string" && val.trim() === "") return 0;
      return Number(val);
    })
    .catch(0);

export const productVariantSchema = z.object({
  name: z.string().min(1, "Variant name is required"),
  sku: z.string().nullable().optional(),
  price: rowNumber("Variant price must be a number").refine(
    (val) => val >= 0,
    "Variant price must be non-negative",
  ),
  compareAtPrice: optionalNumber,
  stock: rowNumber("Stock must be a number")
    .transform((val) => Math.max(0, Math.round(val)))
    .optional(),
  image: z.string().nullable().optional(),
  sortOrder: rowNumber("Sort order must be a number").optional(),
});

export const createProductSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters long"),
  slug: z.string().optional(),
  description: z.string().nullable().optional(),
  price: optionalNumber,
  maxPrice: optionalNumber,
  compareAtPrice: optionalNumber,
  videoIntro: z.string().nullable().optional(),
  images: z.array(z.string()).default([]).optional(),
  attributes: z
    .array(
      z.object({
        name: z.string(),
        value: z.string(),
      }),
    )
    .nullable()
    .optional(),
  faq: z
    .array(
      z.object({
        q: z.string(),
        a: z.string(),
      }),
    )
    .nullable()
    .optional(),
  isFeatured: z.boolean().default(false).optional(),
  status: z
    .enum([ProductStatus.DRAFT, ProductStatus.PUBLISHED])
    .default(ProductStatus.DRAFT)
    .optional(),
  categoryId: z.string().nullable().optional(),
  brandId: z.number().int().nullable().optional(),
  tagIds: z.array(z.string()).default([]).optional(),
  variants: z.array(productVariantSchema).default([]).optional(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  metaKeywords: z.string().nullable().optional(),
  metaRobots: z.string().nullable().optional(),
  sku: z.string().nullable().optional(),
  priceCurrency: z.string().nullable().optional(),
  availability: z.string().nullable().optional(),
});
