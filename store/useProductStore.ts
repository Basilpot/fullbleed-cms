import { create } from "zustand";

export const FIELD_LABELS: Record<string, string> = {
  title: "Title",
  slug: "Slug",
  description: "Description",
  images: "Images",
  price: "Price",
  maxPrice: "Max price",
  compareAtPrice: "Compare-at price",
  videoIntro: "Video intro",
  isFeatured: "Featured",
  status: "Status",
  variants: "Variants",
  attributes: "Attributes",
  categoryId: "Category",
  brandId: "Brand",
  tagIds: "Tags",
  faq: "FAQ",
  metaTitle: "Meta title",
  metaDescription: "Meta description",
  metaKeywords: "Meta keywords",
  metaRobots: "Meta robots",
  sku: "SKU",
  priceCurrency: "Currency",
  availability: "Availability",
};

type ProductStore = {
  currentStep: number;
  stepErrors: Record<number, string[]>;
  setStep: (step: number) => void;
  setStepErrors: (errors: Record<number, string[]>) => void;
  resetForm: () => void;
};

export const useProductStore = create<ProductStore>((set) => ({
  currentStep: 1,
  stepErrors: {},
  setStep: (step) => set({ currentStep: step }),
  setStepErrors: (stepErrors) => set({ stepErrors }),
  resetForm: () => set({ currentStep: 1, stepErrors: {} }),
}));
