# Ash & Moss Admin Dashboard

The admin dashboard for the Ash & Moss furniture store. Built with Next.js App Router; provides authenticated content management for products, orders, payments, blog posts, info pages, site navigation, and SEO-related redirects.

## Overview

- Admin authentication via `/login`
- Protected dashboard and content management at `/dashboard`
- CRUD management for:
  - Products, variants, and product images
  - Categories, brands, and tags
  - Orders and payments
  - Info pages and legal pages
  - Blog posts and authors
  - Testimonials and reviews
  - Navigation (navbar/footer)
  - Media library and redirects
  - Site configuration (brand, contact, store setup)
- Server-side protected layout using cookies and session guard

## Technology Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- Radix UI primitives
- Lucide icons
- React Hook Form + Zod
- Zustand for state management
- Sonner for notifications
- TipTap rich text editor

## Project Structure

- `app/` — Next.js app directory
  - `app/login/` — login page and form (`/admin` redirects here)
  - `app/(dash)/` — protected dashboard routes and admin UI pages
  - `app/layout.tsx` — root HTML layout
- `components/` — reusable UI components, atoms, molecules, organisms, and page components
- `lib/` — helper utilities, fonts, validation, and config
- `store/` — client-state management hooks

## Key Pages

- `/login` — admin login page
- `/dashboard` — store analytics (products, orders, revenue)
- `/products`, `/categories`, `/brands`, `/tags` — catalog management
- `/orders`, `/payments` — order and payment management
- `/posts`, `/authors` — blog content
- `/testimonials`, `/reviews` — social proof
- `/navbar`, `/footer` — manage navigation
- `/media` — media library
- `/redirects` — manage redirect rules
- `/settings` — brand, contact, store setup, site config

## Setup

```bash
pnpm install
pnpm dev
```

The app runs on `http://localhost:3001` in this stack (API on `:3000`).

## Environment Variables

The app expects the following environment variables to connect to the API and configure the admin experience:

- `API_BASE_URL` — backend API base URL (server-side only, never exposed to the browser; all client calls go through the same-origin `/api` proxy)
- `NEXT_PUBLIC_WEBSITE_URL` — storefront URL used for preview links and redirects
- `NEXT_PUBLIC_WEBSITE_DOMAIN` — storefront domain used for image domains
- `NEXT_PUBLIC_IMAGE_DOMAIN` — API image hostname for `next/image`
- `NEXT_PUBLIC_ADMIN_EMAIL` — admin email displayed in the sidebar
- `NEXT_PUBLIC_FRONTEND_BASE_URL` — storefront base URL
- `NEXT_PUBLIC_IS_GROWFORE` — agency-branding toggle

## Scripts

- `pnpm dev` — start development server
- `pnpm build` — build production app
- `pnpm start` — run production server
- `pnpm lint` — run ESLint

## Notes

- The admin layout uses server-side cookie checking and redirects unauthorized users to `/login`.
- API requests are made from client components using `fetch` with `credentials: "include"`.
- The project is structured as an admin-first dashboard rather than a public-facing site.

## License

This repository is private and intended for internal store management. Powered by [Growfore Solution](https://growfore.com/).
