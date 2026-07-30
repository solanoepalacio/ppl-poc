-- Add a production category to every catalog product. Each product is baked on one of
-- two production lines: `salty` (savory breads) or `sweet` (pastries). The column is a
-- plain TEXT constrained by the shared ProductCategory union and validated in the service
-- layer (SQLite + Prisma have no native enums), mirroring Order.status / Slot.status.
--
-- Existing rows need a value for the NOT NULL add, so the column carries a default of
-- 'salty'. The seed writes each product's real category (on both the create and update
-- paths), so `yarn prisma:seed` backfills existing rows to their correct category.

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'salty';
