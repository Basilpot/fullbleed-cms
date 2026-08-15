export type FontOption = {
  id: string;
  label: string;
  family: string;
  category: "sans" | "serif" | "display";
};

// ponytail: fixed option list, stored as ids in siteConfig. Loaded on the
// storefront via a runtime Google Fonts link (only the 2 chosen download).
// Mirrored in storefront/lib/fonts.ts — keep in sync when editing.
export const FONTS: FontOption[] = [
  { id: "inter", label: "Inter", family: "Inter", category: "sans" },
  { id: "sora", label: "Sora", family: "Sora", category: "sans" },
  { id: "livvic", label: "Livvic", family: "Livvic", category: "sans" },
  { id: "nunito-sans", label: "Nunito Sans", family: "Nunito Sans", category: "sans" },
  { id: "work-sans", label: "Work Sans", family: "Work Sans", category: "sans" },
  { id: "open-sans", label: "Open Sans", family: "Open Sans", category: "sans" },
  { id: "lato", label: "Lato", family: "Lato", category: "sans" },
  { id: "poppins", label: "Poppins", family: "Poppins", category: "sans" },
  { id: "montserrat", label: "Montserrat", family: "Montserrat", category: "sans" },
  { id: "playfair-display", label: "Playfair Display", family: "Playfair Display", category: "serif" },
  { id: "lora", label: "Lora", family: "Lora", category: "serif" },
  { id: "dm-serif-display", label: "DM Serif Display", family: "DM Serif Display", category: "display" },
];

export const DEFAULT_FONTS = { primary: "livvic", secondary: "livvic" };

export const getFont = (id?: string | null): FontOption | undefined =>
  FONTS.find((f) => f.id === id);
