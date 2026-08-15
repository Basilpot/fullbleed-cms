---
version: 2.0
name: Travel-Dashboard-Design
description: The admin dashboard design system — an enlarged, light-only interface set in Livvic, on an ash-white canvas with a hunter-green primary (the "Ash and Moss" palette). Design tokens are ported from the Walkthrough Nepal CMS design reference (cms.walkthroughnepal.com) and defined as CSS custom properties in app/globals.css. This document is the authoritative reference for UI work in travel-dashboard.

colors:
  primary: "#3a5a40"
  on-primary: "#f8f8f8"
  canvas: "#ffffff"
  canvas-soft: "#f7f7f7"
  ink: "#1f2e26"
  body: "#615b48"
  mute: "#8a8a8a"
  hairline: "#dad7cd"
  ring: "#3a5a40"
  destructive: "#c53030"
  selection-bg: "#3a5a40"
  selection-fg: "#ffffff"

tokens:
  - All semantic tokens live in `app/globals.css` `:root` as oklch/hex custom properties (background, foreground, card, popover, primary, secondary, muted, accent, destructive, border, input, ring, chart-1..5, sidebar*, radius).
  - Light-only. There is no dark theme; `.dark` tokens were removed. UI components keep their `dark:` variants (dormant) but no theme toggle/ThemeProvider exists.
  - Radius scale is derived from `--radius: 0.625rem`.

typography:
  font:
    family: Livvic
    import: "`Livvic` from `next/font/google` in `lib/font.ts`; applied as `livvic.className` on `<html>` in `app/layout.tsx`"
    weights: "400, 500, 600, 700"
  base:
    fontSize: "18px (html font-size: 112.5%; all rem spacing/font sizes scale ~12.5% up from the 16px default)"
  scale:
    - sm: 0.875rem
    - base: 1rem (controls, body, inputs, labels, buttons, menu items)
    - lg: 1.0625rem (sidebar menu buttons)
    - xl: 1.25rem
    - 2xl: 1.5rem
    - 3xl: 1.875rem
    - 4xl: 2.25rem
  headings: "700 weight, letter-spacing -0.02em, same Livvic family (no display face)"
  mono: "system mono stack via `--font-mono`"

spacing:
  - "Tailwind spacing scale (rem-based), scaled up by the 112.5% root font-size."
  - "Page chrome: content padding p-8; --sidebar-width: calc(var(--spacing) * 72); --header-height: calc(var(--spacing) * 12)."
  - "Controls: inputs/selects/buttons are 2.75rem tall with 0.625rem radius (see the `[data-slot]` size-up block in globals.css)."

sizing-up:
  - "A global UI size-up block in app/globals.css uses `[data-slot]` selectors so every shadcn/ui control is enlarged without editing each component: input/select-trigger 2.75rem tall / 1rem text; button (non-icon) 2.75rem tall / 1rem text; textarea 1rem; label 1rem; select-item & dropdown-menu items 1rem with 0.625rem vertical padding; sidebar-menu-button 1.0625rem; table-head 0.9375rem."

components:
  - shadcn/ui (new-york), Tailwind CSS 4, tokens consumed via `@theme inline` color maps.
  - Layout: shadcn sidebar (inset variant), site header with page title, content padded p-8.
  - Data tables: TanStack Table via `components/data-table.tsx`.
  - Rich text: TipTap/ProseMirror editors; styles in app/globals.css.

principles:
  - Larger, more comfortable touch targets and read sizes everywhere — the dashboard must feel airy, not dense.
  - Hunter green (#3a5a40) is the single action/active color; neutrals do the rest. Sidebar active states use the same hunter-green primary.
  - Light-only surfaces, near-white sidebar, subtle hairlines for separation.
  - Livvic everywhere: no serif or display face; headings differentiate by weight and tracking.
