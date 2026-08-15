# Admin dashboard (travel-dashboard)

Next.js 16 App Router, React 19, Tailwind CSS 4, TypeScript, shadcn/ui (new-york, `@/*` → package root).

```sh
pnpm dev              # next dev (localhost:3001 in this stack)
pnpm build            # next build
pnpm lint             # eslint (next/core-web-vitals + typescript); no-explicit-any is warn
```

- API proxy: dev proxies `POST /api/*` → `http://localhost:3000/api/v1/*`; production uses `API_PROXY_URL`. All API calls use `fetch` with `credentials: "include"`.
- Admin login at `/login`, dashboard in `app/(dash)/`. Signup at `/signup`, verify at `/verify/[token]`. `/admin` redirects to `/login`.
- Sidebar menu is `components/app-sidebar.tsx` (`navGroups`, `QUICK_ACTIONS`, `SECONDARY_NAV`) — add new pages there.
- API client pattern: plain functions in `app/actions/index.ts`.
- `/team` = marketing team members CRUD, NOT staff accounts. There is no billing/plans page yet (SaaS feature pending).
- `travel-dashboard/DESIGN.md` documents the Vercel-inspired design system — treat as authoritative for UI work.
- MCP: `next-devtools` via `.mcp.json`.
