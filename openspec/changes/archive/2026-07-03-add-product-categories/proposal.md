## Why

Every catalog product is baked on one of two **production lines**: *salados* (savory breads) or *dulces* (sweets and pastries). The two lines are run by different teams and produced separately, so the production totals for each line need to be read off separate sheets. Today the catalog has no notion of a category — a `Product` is just `{ id, name, active }` — and the single production view (`/production`) mixes both lines into one flat list, which the bakery cannot split across the two production areas.

This change gives every product a **category** (`sweet` | `salty`, English in code per the repo convention) and splits the production view into two category-scoped views — **Producción salados** and **Producción dulces** — each reachable from the persistent back-office navigation.

## What Changes

- Add a required **`category`** attribute to `Product`, stored as a validated string union (`sweet` | `salty`) mirroring `SlotStatus` — SQLite has no native enums, so it is a plain `String` column validated in the service layer, not a Prisma enum.
- **Seed** every catalog product with its category (the 13 savory breads as `salty`, all pastries/sweets as `sweet`). Reconcile `Baguett Rustica` → `Baguetta Rustica`.
- **Production totals become category-filterable:** `GET /orders/production` accepts an optional `category` query param; when present, only products in that category contribute to the totals.
- **Split the production view into two:** replace the single **Producción** back-office view/link with **Producción salados** (`/production/salados`) and **Producción dulces** (`/production/dulces`), each showing only its line's totals. The old `/production` route redirects to `/production/salados`.

## Capabilities

### Modified Capabilities

- `production-totals`: catalog products now carry a production category; production totals can be scoped to one category; the back office surfaces them on two category-specific views instead of one.
- `back-office-navigation`: the single **Producción** link becomes two — **Producción salados** and **Producción dulces** — joining **Órdenes** and **Bloques**.
- `back-office-presentation`: the "no redundant title" and "omit explanatory copy" rules now apply to both category production views.

## Impact

- **Data**: `Product` gains a NOT NULL `category` column (`TEXT DEFAULT 'salty'` so the SQLite `ADD COLUMN` is valid on existing rows; the reseed backfills each row's real category). Migration `add_product_category`.
- **Backend**: `getProductionTotals(slotId?, category?)` filters items by `product.category` when a category is given; `GET /orders/production` reads and validates a `category` query param (`isProductCategory`). `getCatalog()` is unchanged — it already returns all `Product` columns, so `category` flows to `GET /products` and the token-validation catalog automatically.
- **Shared**: new `product-category.ts` (`ProductCategory` union, `PRODUCT_CATEGORIES`, `isProductCategory`); `category` added to the `Product` model type; both exported from the barrel.
- **Frontend**: `getProductionTotals(slotId?, category?)` sends `&category=`; a shared `ProductionView` component (extracted from the old page) is rendered by two new pages (`production/salados`, `production/dulces`); the old `production/page.tsx` redirects to salados; `BackofficeNav` swaps one link for two.
