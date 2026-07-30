## Why

We deploy Pannico but have no visibility into how it is actually used — how many
order links get opened, how many convert to confirmed orders versus WhatsApp
fallbacks, or how the back-office is exercised. A privacy-friendly umami instance
already runs in the homelab; wiring the frontend to it gives usage insight with
near-zero overhead and no new infrastructure.

## What Changes

- Add the umami tracking script to the Next.js frontend so all page views are
  captured automatically on deployed environments.
- Gate analytics so it is **disabled during local development** and **enabled on
  deployment** — no tracking traffic or noise from `next dev`.
- Add a small typed client-side helper for emitting custom umami events, and
  instrument the meaningful conversion/action points (order confirmed, WhatsApp
  fallback, invalid link, link generated/copied, direct order created, order
  status changed / edited / deleted).
- Add a documentation file enumerating every available analytics event, its
  trigger, and its properties — the single source of truth for the umami event
  taxonomy.

## Capabilities

### New Capabilities
- `analytics`: Captures frontend usage on deployed environments via umami —
  automatic page views plus a defined set of custom events for key user actions,
  disabled in local development, with a documented event taxonomy.

### Modified Capabilities
<!-- None — no existing spec's requirements change; analytics is purely additive. -->

## Impact

- **Frontend** (`packages/frontend`):
  - Root layout (`src/app/layout.tsx`) gains the umami `<Script>` injection,
    rendered only on deployed environments.
  - New analytics module (`src/lib/analytics.ts`) + an injection component.
  - Client components in the order flow and back-office gain event calls:
    `order/[token]/OrderForm.tsx`, `(backoffice)` order/link/status/edit/delete
    components.
- **Configuration**: umami host and website id (overridable via
  `NEXT_PUBLIC_UMAMI_*` env vars, defaulting to the homelab values); enablement
  keyed off the build environment.
- **Docs**: new event-taxonomy reference document checked into the repo.
- **Dependencies**: none added — uses built-in `next/script` and the global
  `window.umami` provided by the loaded script.
- **No backend, schema, or API changes.**
