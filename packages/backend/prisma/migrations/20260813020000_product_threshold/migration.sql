-- The unique index goes first, on purpose.
--
-- It is the only statement here that can fail: it does so if two products
-- already share a name, and SQLite gives no way to know that from the schema
-- alone. Running it first means such a failure leaves the table exactly as it
-- was, instead of a half-applied migration with the column added, no index, and
-- a failed row in _prisma_migrations to unpick by hand.
CREATE UNIQUE INDEX "Product_name_key" ON "Product"("name");

-- ALTER TABLE rather than the table rebuild Prisma generates for SQLite. A
-- rebuild drops and recreates Product, which every OrderItem, SlotExistence and
-- SlotProduced row points at; adding a column with a default needs none of that
-- risk, touches no data, and is instant.
ALTER TABLE "Product" ADD COLUMN "threshold" INTEGER NOT NULL DEFAULT 0;
