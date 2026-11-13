# recr-monkey

Personal subscription tracker: one number for monthly spend, a 30-day agenda of
upcoming charges, multi-currency support. Single-user-focused side project by
shadowlanes, deployed at recr.shadowlanes.com (frontend) and
api.recr.shadowlanes.com (backend).

The UI and most of the frontend were rebuilt from scratch on the `rewrite_v3`
branch (Nov 2026). Design reference: the "Recr Monkey Redesign" mockup artifact.

## Architecture

Two apps in one repo, deployed separately:

- `src/web/` — Next.js 16 (App Router, Tailwind v4, TypeScript). Static pages,
  all client-rendered behind auth. Talks to the backend with `credentials:
  'include'` (cookie sessions, CORS allowlist in backend `index.ts`).
- `src/backend/` — Express + TypeScript + node-postgres. Runs its own SQL
  migrations from `src/backend/migrations/` on startup (tracked in a
  `migrations` table; files run in filename order, never edit an applied one —
  add a new numbered file).
- Auth is **better-auth** (email/password + Google OAuth). It owns the `user`,
  `session`, `account`, `verification` tables via its own CLI migration (see
  README). App tables reference `user(id)`.

### Data model

- `payment_sources` — optional metadata (name, type, last-4). FK from payments
  is `ON DELETE SET NULL`: deleting a source detaches, never deletes payments.
- `recurring_payments` — name, amount, **currency** (billing currency, kept
  native), frequency (`weekly|monthly|4weeks|yearly`), nullable
  `payment_source_id` and `category`, `start_date`.
- `user_preferences` — `display_currency` per user.

### Multi-currency model (the key invariant)

Subscriptions always store and display their **native billing currency**.
Totals/normalized values convert at render time to the user's display currency
via USD-based rates from `GET /api/rates` (backend fetches open.er-api.com,
24h in-memory cache, stale-cache fallback). Never store converted amounts.

## Frontend map (src/web/app/)

- `layout.tsx` — root: fonts (Schibsted Grotesk = display, Spline Sans = body,
  Spline Sans Mono = money/dates) + AuthProvider.
- `page.tsx` — public landing + auth card; redirects signed-in users to
  /dashboard.
- `dashboard/layout.tsx` — auth gate + providers (Data, Settings,
  PaymentDialog) + header shell (nav, currency switch, + Add, account menu).
- `dashboard/page.tsx` — Overview: spend hero, 30-day agenda, category bar.
- `dashboard/subscriptions/page.tsx` — sortable table, rows open edit dialog.
- `dashboard/settings/page.tsx` — payment sources CRUD + display currency.
- `dashboard/payment-dialog.tsx` — global quick-add/edit dialog (context:
  `usePaymentDialog().openAdd/openEdit`), inline source creation, 2-step delete.
- `contexts/data-context.tsx` — payments + sources CRUD state over the API.
- `contexts/settings-context.tsx` — rates + display currency (optimistic,
  localStorage warm start, persisted via /api/preferences).
- `lib/money.ts` — convert / monthlyAmount / formatMoney. Pure, unit-tested.
- `lib/upcoming.ts` — next-charge-date math (month-end clamping, Feb 29),
  windowed charge generator. Pure, unit-tested.
- `lib/categories.ts` — category list + token-based colors.
- `components/ui/` — Button, Dialog, Field/Input/Select, ChipGroup, DateTile,
  EmptyState. Build screens from these; don't hand-roll modals or buttons.

## Conventions

- **No hardcoded colors.** All color/type comes from tokens in `globals.css`,
  mapped to Tailwind utilities via `@theme inline` (`bg-surface`, `text-ink`,
  `text-muted`, `bg-accent`, `border-line`, …). Dark mode is automatic via
  `prefers-color-scheme` on the same tokens.
- Money and dates render in the mono font with `tnum` (tabular numerals).
- `'4weeks'` frequency is legacy: supported in math and editing, hidden from
  the add flow.
- API responses are `{ data, error }` envelopes; frontend api-client throws on
  `error`.
- User-scoping: every protected route uses `requireAuth` middleware and filters
  by `req.user.id`. Never trust a client-sent user id.

## Commands

```bash
# Frontend (src/web)
npm run dev          # next dev --turbopack on :3000
npm run build        # production build (verify before committing)
npx jest             # unit tests (lib/money, lib/upcoming)

# Backend (src/backend)
npm run dev          # if defined; otherwise npx ts-node src/index.ts on :3001
npx tsc --noEmit     # typecheck

# Full stack
cd src && docker compose up -d   # backend + web; uses the host Postgres (host.docker.internal:5432, db recr_monkey_db)
# better-auth + app migrations run automatically on backend start
```

## Gotchas

- Local dev login hack: backend `DEV_AUTH_BYPASS=true` (+ web `NEXT_PUBLIC_DEV_AUTH=true`) makes
  any email/password sign in via `POST /api/auth/dev-login` (auto-creates the user). Ignored when
  `NODE_ENV=production`; never set in deployed envs. Backend `npm run dev` loads `.env`.

- Local port 5432 may already be taken by a native Postgres; stop it or remap
  the compose port before `docker compose up`.
- A transient Turbopack error ("next/font/google queries have exactly one
  entry") can appear on stale caches — `rm -rf .next` and rebuild.
- Git: user prefers commits **without** Claude co-author attribution.

## Not built yet (ideas discussed)

- Renewal reminders (email N days before a charge) — the Settings page hints
  at it; would need a scheduler.
- Calendar grid as an optional view toggle on Subscriptions (the old
  five-tab calendar UI was deliberately removed).
