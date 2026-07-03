## Context

The catalog is a fixed preset list loaded by a Prisma seed (no management UI, per `config.yaml`). A `Product` today is `{ id, name, active }` with no attribute distinguishing the two production lines. The single production view aggregates every product for a bloque into one flat, name-sorted list. The bakery runs *salados* and *dulces* on separate lines and needs each line's totals in isolation.

This change adds a `category` attribute to the product and splits the production view along it. Nothing about bloques, order intake, or the aggregation math changes — only which products a given production view counts.

## Goals / Non-Goals

**Goals:**
- Every catalog product belongs to exactly one category: `sweet` or `salty`.
- The category is part of the shared API contract, surfaced on `Product` wherever the catalog is served.
- Production totals can be scoped to a single category.
- Two dedicated back-office production views, one per line, each reachable from the nav.

**Non-Goals:**
- Catalog-management UI — category is assigned in the seed, like the rest of the catalog.
- More than two categories, or products in multiple categories.
- Category-based grouping on the customer order form or the manual order-creation modal (the catalog still validates by id; category is not enforced there).
- Changing how a bloque is selected or how totals are summed.

## Decisions

**1. `category` is a validated string union, not a Prisma enum.**
Mirrors the existing `SlotStatus` / `OrderStatus` pattern: SQLite has no native enums, so `Product.category` is a `String` column and `ProductCategory` (`'sweet' | 'salty'`) with `PRODUCT_CATEGORIES` + `isProductCategory` lives in `packages/shared/src/product-category.ts`. English in code; Spanish (*salados* / *dulces*) only in UI labels.
*Alternative:* a Prisma enum — not supported on SQLite and inconsistent with the rest of the codebase.

**2. The migration column carries a default; the reseed sets the real value.**
Adding a NOT NULL column to an existing SQLite table requires a default, so the migration adds `category TEXT NOT NULL DEFAULT 'salty'`. The seed then writes each product's true category on both the create and update paths, so a reseed backfills existing rows correctly. `salty` is an arbitrary safe default (the savory breads); no product is left uncategorized after seeding.
*Alternative:* nullable column + later backfill — rejected; every product must have a category, and the seed already runs on every setup.

**3. Production totals filter by category via an optional query param.**
`getProductionTotals(slotId?, category?)` skips items whose `product.category` doesn't match when a category is passed; with no category it behaves exactly as before. `GET /orders/production` reads `?category=` and validates it with `isProductCategory` (ignoring unknown values). The `product` relation is already `include`d in the aggregation, so no extra query. Filtering server-side keeps each view's payload to just its line.
*Alternative:* return `category` on every `ProductionTotalItem` and filter in the browser — more data over the wire and duplicated filtering logic per view.

**4. Two routes, not one view with a toggle.**
`/production/salados` and `/production/dulces` are distinct pages, each an async server component that calls `getProductionTotals(slotId, 'salty' | 'sweet')`. A shared `ProductionView` component (extracted from the old inline page) renders the `SlotPicker` + totals list + empty state, parameterized by `basePath` (so the picker navigates within the correct view) and `category`. The old `/production` route redirects to `/production/salados` so no dead route remains. `BackofficeNav`'s active state is exact `pathname === href`, which already distinguishes the two sub-paths.
*Alternative:* one `/production?cat=` view with tabs — rejected; the user wants two first-class, separately-navigable views matching the two physical production areas.

## Risks / Trade-offs

- **`category` default `'salty'` in the migration** → any row not touched by the seed would read as savory. Mitigated: the seed covers the entire catalog and runs on every setup; there is no other product source.
- **Category not enforced at order intake** → a category is a product attribute only; order items still validate by product id. Intended — intake behavior is unchanged.
- **Old `/production` links** → redirected to `/production/salados`, so bookmarks keep working.

## Migration Plan

Single Prisma migration `add_product_category`: `ALTER TABLE "Product" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'salty'`. Forward-only; the reseed (`yarn db:setup`) writes each product's real category. Rollback is dropping the column (no data depends on it beyond the two production views).

## Open Questions

None.
