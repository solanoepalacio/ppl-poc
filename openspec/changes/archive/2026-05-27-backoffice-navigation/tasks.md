## 1. Back-office route group + shared nav

- [x] 1.1 Create the route group `packages/frontend/src/app/(backoffice)/` and move `orders/`, `links/`, and `production/` into it (URLs stay `/orders`, `/links`, `/production`)
- [x] 1.2 Add `(backoffice)/layout.tsx` that renders the shared nav above `{children}`
- [x] 1.3 Create a `BackofficeNav` client component with links Órdenes → `/orders`, Crear link → `/links`, Producción → `/production`; use `usePathname` to mark the active link (`aria-current="page"`)

## 2. Landing redirect

- [x] 2.1 Replace `packages/frontend/src/app/page.tsx` with a server `redirect('/orders')` (from `next/navigation`)

## 3. Remove per-page back-links

- [x] 3.1 Remove the "← Back office" link from the orders page
- [x] 3.2 Remove the "← Back office" link from the links page
- [x] 3.3 Remove the "← Back office" link from the production page

## 4. Styling

- [x] 4.1 Add a `.nav` (and active-link) style block to `globals.css` using the existing brand-slate / line / amber tokens

## 5. Verification

- [x] 5.1 `yarn workspace @pannico/frontend run lint` and `build` pass
- [x] 5.2 Confirm `/` redirects to `/orders`, the nav appears on all three back-office views with the active one indicated, and the customer order form `/order/[token]` shows no nav
