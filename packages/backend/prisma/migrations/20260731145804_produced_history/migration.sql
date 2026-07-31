-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SlotProduced" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slotId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SlotProduced_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SlotProduced_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
-- Each pre-existing per-product row becomes that product's single history entry.
-- createdAt is written as integer milliseconds since the epoch, which is how
-- Prisma encodes DateTime on SQLite. NOT `CURRENT_TIMESTAMP`: that yields TEXT,
-- and SQLite orders every INTEGER before every TEXT regardless of value, so a
-- backfilled row would sort after every later entry and the history would read
-- out of order.
INSERT INTO "new_SlotProduced" ("id", "productId", "quantity", "slotId", "createdAt")
SELECT "id", "productId", "quantity", "slotId", CAST(strftime('%s', 'now') AS INTEGER) * 1000 FROM "SlotProduced";
DROP TABLE "SlotProduced";
ALTER TABLE "new_SlotProduced" RENAME TO "SlotProduced";
CREATE INDEX "SlotProduced_slotId_idx" ON "SlotProduced"("slotId");
CREATE INDEX "SlotProduced_slotId_productId_idx" ON "SlotProduced"("slotId", "productId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
