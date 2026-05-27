## Why

The back office has three views (orders by day, link generator, production totals) but reaching them goes through a separate landing page that exists only to hold links — an extra hop with no content of its own. The manager's day starts on the orders view, so that should be the landing, with the other views one persistent click away.

## What Changes

- **BREAKING** (routing): remove the back-office landing page; the root path now lands directly on the orders-by-day view.
- Add a persistent header with a nav bar shown across all back-office views, linking the three views with Spanish labels: **Órdenes** (orders by day), **Crear link** (link generator), **Producción** (production totals).
- The nav indicates which view is currently active.
- Each view drops its ad-hoc "← Back office" link in favor of the shared nav.

## Capabilities

### New Capabilities

- `back-office-navigation`: the back office lands on the orders-by-day view by default (no standalone home page) and presents a persistent nav across its views linking Órdenes, Crear link, and Producción, with the current view indicated.

### Modified Capabilities

- `production-totals`: the requirement that the production view is "reachable from the back-office home" changes — it is now reachable from the persistent back-office navigation (the home page is removed).

## Impact

- **Frontend only.** No backend, API, data, or shared-type changes.
- Remove `packages/frontend/src/app/page.tsx` (the landing page) and make the orders view the root, e.g. via a redirect from `/` to `/orders` or by relocating the orders view to the root route.
- Add a shared back-office nav component, rendered for the back-office routes (likely via a route-group layout) — `packages/frontend/src/app/layout.tsx` and a new nav component.
- Update `orders`, `links`, and `production` pages to drop their individual back-link.
- Add nav styling in `packages/frontend/src/app/globals.css`.
