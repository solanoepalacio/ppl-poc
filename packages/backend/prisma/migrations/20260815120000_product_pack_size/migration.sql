-- How many units make up one pack of a product. 0 means it has no pack and is
-- ordered by the unit, which is every product that exists when this is applied —
-- so the column is additive and changes no behaviour on its own.
ALTER TABLE "Product" ADD COLUMN "packSize" INTEGER NOT NULL DEFAULT 0;
