# FormNest Frontend

React 18 + TypeScript + Vite + Tailwind frontend for FormNest.

## Quick start

```bash
cp .env.example .env       # configure VITE_API_URL etc.
npm install
npm run dev                 # http://localhost:5173
npm run build               # production build to dist/
npm run typecheck           # tsc only
```

## Folder layout

```
src/
├── api/             axios client + endpoint constants + per-domain services
├── components/      ui/ (primitives), builder/, renderer/, layout/, etc.
├── pages/           marketing/, auth/, dashboard/, developer/, account/, public/
├── store/           Zustand: authStore, builderStore, uiStore
├── hooks/           useDebounce, useAutoSave, useCopyToClipboard
├── lib/             cn, env, formValidation
├── types/           frontend-only types (not shared with backend)
├── routes.tsx       React Router v6 data router
├── App.tsx          QueryClient + RouterProvider + Toaster + ErrorBoundary
├── main.tsx
└── styles.css
```

## Conventions

- TS strict, zero `any`, zero `console.log`
- State management:
  - **Server state** → TanStack Query (caching, refetch, optimistic)
  - **Auth + builder + UI** → Zustand (with immer for builder)
  - **Form input** → React Hook Form + Zod
- Access token in MEMORY ONLY (never localStorage). User object in sessionStorage.
- Refresh token in HTTP-only Secure cookie set by backend.
- One axios client with refresh-token queue: concurrent 401s share single refresh.
- `renderer/` components used by BOTH builder preview AND public form view (single source of truth).

## Accessibility

- Every input has a real `<label>` with proper `htmlFor`/`id`
- Error messages with `aria-describedby` + `role="alert"`
- Focus rings preserved (`:focus-visible` in styles.css)
- Keyboard-accessible drag-drop via `@dnd-kit`

## Build & deploy

- `npm run build` → static assets in `dist/`
- Deploy to Vercel / Cloudflare Pages
- Set env in dashboard: `VITE_API_URL`, etc.
