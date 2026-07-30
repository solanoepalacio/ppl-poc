## Context

The frontend (Next.js app router) currently has a back-office landing page at `/` (`app/page.tsx`) whose only content is three links, plus three back-office views — `/orders`, `/links`, `/production` — each carrying its own "← Back office" link back to `/`. The customer-facing order form lives at `/order/[token]` and must stay free of any back-office chrome. The root `layout.tsx` wraps every route in `<main>`; the customer form has its own `BrandHeader`.

This change makes the orders view the landing destination and replaces the per-page back-links with one persistent nav shared by the back-office views only.

## Goals / Non-Goals

**Goals:**
- Landing on the back office shows the orders-by-day view, with no standalone home page.
- A persistent nav across the three back-office views (Órdenes, Crear link, Producción), indicating the active view.
- The customer order form is unaffected (no nav, no redirect).

**Non-Goals:**
- No backend/API/data changes; existing routes and response shapes are untouched.
- No renaming of the `/orders`, `/links`, `/production` URLs.
- No auth, no new views, no restyle of the views' contents beyond removing the old back-link.

## Decisions

**1. Group the back-office views under a route group `(backoffice)` with a shared layout.**
Move `orders/`, `links/`, and `production/` under `app/(backoffice)/`. A route group keeps the URLs identical (`/orders`, `/links`, `/production`) while letting `(backoffice)/layout.tsx` render the nav once for all three. The customer form stays outside the group and gets no nav.
*Alternative:* render the nav inside the root `layout.tsx` and conditionally hide it on `/order/*` — rejected; conditional chrome by pathname is fragile and leaks back-office concerns into the customer route.

**2. Land on orders via a redirect from `/` to `/orders`.**
Replace `app/page.tsx` with a server `redirect('/orders')` (from `next/navigation`). Keeps the orders view at its existing `/orders` URL and gives the nav a single stable target to mark active.
*Alternative:* make the orders view the literal index of the group (`(backoffice)/page.tsx` at `/`) — rejected; it splits "orders" across two URLs (`/` and `/orders`) and complicates active-state logic. A redirect is simpler and unambiguous.

**3. Nav is a small client component using `usePathname` for active state.**
The nav needs to highlight the current view, which requires the pathname. A client component with `next/navigation`'s `usePathname` marks the matching link active (`aria-current="page"`). The links are plain `next/link` anchors.
*Alternative:* compute active state server-side per page and pass a prop — rejected; it pushes nav knowledge into every page and duplicates the link list.

**4. Spanish labels, existing URLs.**
Órdenes → `/orders`, Crear link → `/links`, Producción → `/production`. Labels are presentational; routes stay English to match the codebase.

**5. Style the nav with the existing brand tokens.**
Reuse the `--brand-slate` / `--line` palette already in `globals.css` (the customer `.brand-header` uses the same slate). Add a `.nav` block; active link uses the amber accent already defined.

## Risks / Trade-offs

- **Moving page files under a route group could break relative imports** (e.g. `OrderStatusControl` co-located in `orders/`) → it moves with the folder, and `@/`-aliased imports are unaffected; verify the build after the move.
- **A bookmark to the old `/` landing** now redirects to `/orders` → intended behavior, not a regression; noted as the BREAKING routing change in the proposal.
- **`production-totals` spec references "reachable from the back-office home"** → updated via a delta so the spec stays truthful once the home page is gone.
