# Travel Agency Admin Dashboard

A travel agency admin dashboard built with Next.js App Router that provides authenticated content management for travel experiences, blog posts, site navigation, page content, and SEO-related redirects.

## Overview

This project is a private admin panel for travel-related website management. It includes:

- Admin authentication via `/login`
- Protected dashboard and content management at `/dashboard`
- CRUD management for:
  - Featured trips
  - Trips
  - Info pages and legal pages
  - Blog posts and authors
  - Testimonials
  - Navigation (navbar/footer)
  - Redirects
  - Trip categories, activity types, regions, destinations, and departments
  - Team members
- Analytics widgets for activity and approval status
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
- DnD Kit for drag-and-drop interactions
- Quill rich text editor support

## Project Structure

- `app/` — Next.js app directory
  - `app/login/` — login page and form (`app/admin/` redirects here)
  - `app/(dash)/` — protected dashboard routes and admin UI pages
  - `app/layout.tsx` — root HTML layout
- `components/` — reusable UI components, atoms, molecules, organisms, and page components
- `lib/` — helper utilities, fonts, validation, and config
- `store/` — client-state management hooks

## Key Pages

- `/login` — admin login page
- `/dashboard` — main dashboard analytics view
- `/featured-trips` — manage featured trip listings
- `/trips` — manage full trip catalog and trip approval status
- `/posts` — manage blog posts
- `/authors` — manage author profiles
- `/testimonials` — manage testimonials
- `/navbar` and `/footer` — manage navigation
- `/redirects` — manage redirect rules
- `/regions`, `/destinations`, `/activity-types`, `/trip-categories`, etc. — manage supporting taxonomy data

## Setup

```bash
pnpm install
pnpm dev
```

The app runs on `http://localhost:3000` by default.

## Environment Variables

The app expects the following environment variables to connect to the API and configure the admin experience:

- `API_BASE_URL` — backend API base URL (server-side only, never exposed to the browser; all client calls go through the same-origin `/api` proxy)
- `NEXT_PUBLIC_DOMAIN` — site name / domain used in UI branding
- `NEXT_PUBLIC_ADMIN_EMAIL` — admin email displayed in the sidebar
- `NEXT_PUBLIC_FRONTEND_BASE_URL` — site frontend URL used for preview links
- `NEXT_PUBLIC_WEBSITE_URL` — fallback website URL used in some redirect logic

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

This repository is private and intended for internal travel agency admin use. Powered by [Growfore Solution](https://growfore.com/).
