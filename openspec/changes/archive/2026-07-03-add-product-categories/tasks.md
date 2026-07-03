## 1. Data model & migration

- [x] 1.1 Add `category String @default("salty")` to the `Product` model in `schema.prisma` (validated string union, not a Prisma enum, per the file's convention)
- [x] 1.2 Author migration `add_product_category`: `ALTER TABLE "Product" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'salty'`
- [x] 1.3 Run `prisma generate` so the client types include `category`

## 2. Shared contract

- [x] 2.1 Add `product-category.ts`: `ProductCategory` union (`'sweet' | 'salty'`) + `PRODUCT_CATEGORIES` + `isProductCategory`; export from the barrel
- [x] 2.2 Add `category: ProductCategory` to the shared `Product` model type

## 3. Seed

- [x] 3.1 Type `CATALOG` as `{ name: string; category: ProductCategory }[]` and annotate every entry (13 savory breads `salty`, all sweets/pastries `sweet`)
- [x] 3.2 Rename `Baguett Rustica` → `Baguetta Rustica`; keep a single `Merenguitos`
- [x] 3.3 Thread `category` into both the create and update upsert payloads so a reseed backfills existing rows

## 4. Backend — production totals

- [x] 4.1 `getProductionTotals(slotId?, category?)` — skip items whose `product.category` doesn't match when a category is passed
- [x] 4.2 `GET /orders/production` — read `?category=` and validate with `isProductCategory` (ignore unknown values), pass it through

## 5. Frontend — split the production view

- [x] 5.1 `lib/api.ts`: `getProductionTotals(slotId?, category?)` appends `&category=`
- [x] 5.2 Extract the inline production rendering into a shared `ProductionView` component (SlotPicker + totals list + empty state), parameterized by `basePath` and `category`
- [x] 5.3 Add `production/salados/page.tsx` and `production/dulces/page.tsx`, each rendering `ProductionView` with its own `basePath` and category
- [x] 5.4 Redirect the old `production/page.tsx` to `/production/salados`
- [x] 5.5 `BackofficeNav`: replace the single **Producción** link with **Producción salados** and **Producción dulces**

## 6. Tests & verification

- [x] 6.1 Update/extend backend production-totals service tests to cover category filtering
- [x] 6.2 Typecheck all workspaces, reseed (`yarn db:setup`), run backend tests, and verify end-to-end that each view shows only its line's totals
