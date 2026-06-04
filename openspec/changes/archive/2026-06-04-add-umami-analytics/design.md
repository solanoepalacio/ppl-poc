## Context

Pannico's frontend is a Next.js 14 App Router app (`packages/frontend`) with a
minimal root layout (`src/app/layout.tsx`) that currently injects no scripts and
has no analytics. A umami instance runs in the homelab at `http://umami.home:3000`
with website id `92aac9e1-8f20-4385-ad2d-df7e99619fdf`. The app already uses the
`NEXT_PUBLIC_*` convention for client-exposed config (`NEXT_PUBLIC_API_BASE_URL`
in `src/lib/api.ts`).

Two user journeys are worth measuring: the public tokenized order form
(`/order/[token]`, `OrderForm.tsx`) and the back-office (`/orders`, `/production`
and their modals/controls).

## Goals / Non-Goals

**Goals:**
- Automatic page-view analytics on deployed environments, zero tracking in local dev.
- A handful of high-signal custom events for conversions and management actions.
- A typed, crash-proof event helper usable from any client component.
- A single documented event taxonomy checked into the repo.

**Non-Goals:**
- No backend, Prisma, or API changes.
- No cookie banner / consent UI (umami is cookieless and privacy-friendly).
- No exhaustive instrumentation of every micro-interaction (e.g. per-step quantity
  changes) — only meaningful outcomes.
- No analytics dashboards in-app; umami's own UI is the consumption surface.

## Decisions

### Decision: Gate enablement on the build environment, not a manual flag
Render the umami `<Script>` only when `process.env.NODE_ENV === 'production'`.
`next dev` sets `NODE_ENV=development`, so local development is silent by default
with no extra config. Deployed builds (`next build` + `next start`) are
`production`, so analytics is on automatically.
- **Alternative considered**: a dedicated `NEXT_PUBLIC_UMAMI_ENABLED` flag.
  Rejected as the default mechanism because it requires remembering to set it on
  every deploy; the env-based gate is zero-config and matches the user's framing
  ("disabled in local dev, enabled on deployment"). Host/website-id remain
  overridable via env vars for flexibility.

### Decision: Inject via `next/script` from the root layout
Add a small Server Component (e.g. `src/app/UmamiScript.tsx`) imported into
`layout.tsx` that returns `null` when disabled and otherwise renders
`<Script defer strategy="afterInteractive" src=".../script.js" data-website-id=...>`.
- **Alternative considered**: raw `<script>` in `<head>`. Rejected — `next/script`
  is the idiomatic App Router approach and avoids hydration warnings.

### Decision: Thin `trackEvent` wrapper over `window.umami`
`src/lib/analytics.ts` exposes `trackEvent(name, props?)` that calls
`window.umami?.track(name, props)` inside a guard, doing nothing if umami is
absent. Event names are a typed union so call sites can't drift from the taxonomy.
- **Alternative considered**: calling `window.umami` directly at each site.
  Rejected — duplicated guards, no type safety, easy to typo event names.

### Decision: Curated event set, page views stay automatic
Custom events: `order_confirmed`, `whatsapp_fallback_selected`,
`order_link_invalid`, `order_link_generated`, `order_link_copied`,
`order_created_direct`, `order_status_changed`, `order_items_edited`,
`order_deleted`. Page views (orders/production/order-form) are captured
automatically by umami and not duplicated as custom events.

### Decision: Event taxonomy doc lives in the repo
A markdown reference (e.g. `docs/analytics-events.md` or
`packages/frontend/docs/analytics-events.md`) lists each event, trigger, and
properties. It is the source of truth and must be updated whenever events change.

## Risks / Trade-offs

- **[Homelab host unreachable from public deploys]** → `umami.home` may not resolve
  outside the home network; if so the script simply fails to load and the app is
  unaffected (helper is a no-op). Host is overridable via `NEXT_PUBLIC_UMAMI_HOST`
  if a public endpoint is later needed.
- **[`next build` run locally would enable tracking]** → Acceptable; production
  builds are intended to track. Set `NEXT_PUBLIC_UMAMI_WEBSITE_ID=""` locally if a
  prod build must stay silent.
- **[Event taxonomy drift]** → Typed event-name union forces compile-time
  alignment; the doc requirement and a checklist task keep prose in sync.
- **[Mixed-content / HTTP script]** → The umami host is `http://`; if the app is
  served over HTTPS the browser may block the script. Noted; deployment currently
  targets the homelab over HTTP.

## Migration Plan

Purely additive — no data migration. Deploy ships the script automatically.
Rollback = revert the change; removing the script stops tracking with no residual
state. No env vars are strictly required (defaults are baked in).

## Open Questions

- Final location of the event-taxonomy doc (`docs/` at repo root vs. inside
  `packages/frontend`). Defaulting to `packages/frontend/docs/analytics-events.md`
  to keep it next to the code it documents.
