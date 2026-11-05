# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Casa Tona is an events-venue management app (Spanish UI): events CRUD with a calendar availability
picker, a per-event daily cash box (sales of inventory items + manual movements), an inventory of
drinks/bottles/food with editable prices and stock, and a general cash-flow ledger that auto-aggregates
each closed event's cash box. Two roles: `admin` (full access) and `cajero` (can view events/inventory,
and operate a cash box, but cannot edit events/inventory/prices or see the general ledger).

## Commands

Package manager is pnpm (see `pnpm-lock.yaml`).

```bash
pnpm install          # install dependencies
pnpm dev              # start dev server (vite dev)
pnpm build            # production build (outputs to .output/ via Nitro)
pnpm start            # run the production build: node .output/server/index.mjs
pnpm preview          # preview a production build
pnpm db:types         # regenerate src/types/database.ts from the local Supabase instance
```

There is no test runner or linter configured. To type-check: `pnpm exec tsc --noEmit` (tsconfig has
`noEmit: true`, `strict: true`).

### Supabase / database workflow

The schema lives entirely in `supabase/migrations/` (one migration so far:
`20261105153413_casa_tona_schema.sql`, covering tables, RLS policies, triggers, and table-privilege
grants). `.env.local` points at the real hosted project (not the local Docker stack) — `pnpm dev` talks to
production data by default.

- Local dev loop: `supabase start` (Docker), then `supabase db reset` to apply all migrations fresh, then
  `pnpm db:types` to regenerate `src/types/database.ts` from the local instance.
- To test against local instead of the hosted project, temporarily swap `.env.local` to
  `supabase status -o env`'s `API_URL`/`PUBLISHABLE_KEY` — remember to restore the real values after.
- To ship a schema change: add a new file under `supabase/migrations/`, verify with `supabase db reset`
  locally, then `supabase link --project-ref mepyxqzehemjbnkiyzwt && supabase db push` to apply it to the
  hosted project. `supabase gen types typescript --linked > src/types/database.ts` regenerates types from
  the real schema afterward (prefer this over `--local` right before shipping, so generated types match
  what's actually live).
- **RLS alone is not enough.** Enabling `row level security` only filters rows; Postgres still requires a
  base `GRANT select/insert/update/delete ... to authenticated` on the table or every query 403s with
  "permission denied for table X" regardless of policy. The migration grants these explicitly at the
  bottom — carry that forward in any new migration that adds a table.
- Every write policy is scoped `to authenticated`; there is no `anon` access anywhere by design (an
  unauthenticated REST call correctly gets an empty array back, not an error — RLS default-denies instead
  of erroring once the role has no matching policy).
- `profiles.role` ('admin' | 'cajero') is set from `raw_user_meta_data.role` at signup via the
  `handle_new_user` trigger on `auth.users`, defaulting to `'cajero'` if unset.
- Closing an event's cash box (`event_cash_boxes.status` → `'cerrada'`) fires `close_cash_box_rollup`,
  which inserts one row into `general_cash_flow` with the net total — the app code never computes or
  writes that rollup itself, the trigger is the source of truth.
- Recording a cash movement with an `inventory_item_id` (a product sale) fires `apply_inventory_movement`,
  which decrements `inventory_items.stock_quantity` — deleting that movement restores the stock. Don't
  duplicate this bookkeeping in application code.

## Architecture

SolidStart (Solid.js meta-framework) with file-based routing, SSR via Nitro, Vite 8, Tailwind CSS v4.

- `src/app.tsx` — root: `AuthProvider` wraps `<Nav>` + an `ErrorBoundary` + `<Suspense>` around
  `<FileRoutes />`. The `ErrorBoundary` renders the raw error (including `.cause`, where Supabase's
  `PostgrestError` ends up) — check here first when a page goes blank, since Solid's own console logging
  for an uncaught resource error says only "Unknown error" with no useful detail.
- `src/lib/auth.tsx` — `AuthProvider`/`useAuth()`: holds `session`/`profile`/`isAdmin()` via
  `supabase.auth.onAuthStateChange` + a `profiles` row lookup. No SSR cookie session handling — purely
  client-side, session lives in `localStorage` via supabase-js.
- `src/components/Protected.tsx` — wrap any route's content in `<Protected>` (optionally
  `adminOnly`) to redirect to `/login` when logged out, or show a permission message for the wrong role.
  This is a UX convenience only; RLS is the real enforcement boundary.
- `src/routes/eventos/` — **dynamic segments must be a directory, not a sibling file.** The detail page is
  `eventos/[id]/index.tsx` and the cash box page is `eventos/[id]/caja.tsx`, both under one `[id]/`
  directory. A sibling `eventos/[id].tsx` next to an `eventos/[id]/` directory causes the file route to
  silently 404 instead of matching — this bit once during development, keep the directory form for any
  new nested dynamic route.
- `src/components/EventForm.tsx` — shared form for create/edit; `readOnly` wraps the fields in a
  `<fieldset disabled>` (which also disables nested `<button>`s, including the calendar) rather than
  duplicating a read-only variant.
- `src/components/CalendarDatePicker.tsx` — custom month-grid date picker (no suitable primitive exists in
  `@kobalte/core`, which has no Calendar/DatePicker component). Takes an `occupiedDates: Set<string>` of
  ISO dates to disable; a date equal to the form's current `value` is never treated as occupied, so editing
  an existing event doesn't lock out its own date.
- `src/lib/date.ts` — `toLocalIsoDate` formats dates from local components, not `toISOString()` (which is
  UTC and can shift the day). Also: don't hardcode month-end as `-31` in date-range queries (Postgres
  rejects `"2026-11-31"` outright) — compute the first day of the *next* month and use `.lt()` instead.

### Styling

Tailwind CSS v4 via `@tailwindcss/vite` (no `tailwind.config.js` — v4 is configured through CSS, see
`src/app.css`'s `@import "tailwindcss"`). Solid uses `class`, not `className`.
