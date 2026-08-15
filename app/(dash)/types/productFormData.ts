export interface ProductVariantRow {
  name: string;
  sku?: string | null;
  price: number;
  compareAtPrice?: number | null;
  stock: number;
  image?: string | null;
  sortOrder: number;
}

export interface ProductFormData {
  title: string;
  slug: string;
  description?: string;
  price?: number | null;
  maxPrice?: number | null;
  compareAtPrice?: number | null;
  images: string[];
  attributes: Array<{ name: string; value: string }>;
  faq: Array<{ q: string; a: string }>;
  isFeatured: boolean;
  status: "DRAFT" | "PUBLISHED";
  categoryId?: string | null;
  brandId?: number | null;
  tagIds: string[];
  variants: ProductVariantRow[];
  videoIntro?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
  metaRobots?: string | null;
  sku?: string | null;
  priceCurrency?: string | null;
  availability?: string | null;
}
