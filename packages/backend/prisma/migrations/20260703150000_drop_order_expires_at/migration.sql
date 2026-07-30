-- Drop the fixed-TTL "expiresAt" column from Order. Link validity is no longer
-- time-boxed: a token is valid only while its production bloque (Slot) is open, and
-- closing a bloque expires its still-pending orders. With the TTL retired, the column
-- has no remaining role.
--
-- SQLite cannot DROP a column on a populated table in older engines, so this uses the
-- standard Prisma RedefineTable dance: build new_Order without "expiresAt", copy every
-- other column across, swap it in, and recreate the indexes. No data is lost beyond the
-- retired column.

-- RedefineTable: rebuild Order without "expiresAt".
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "slotId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" DATETIME,
    "message" TEXT,
    CONSTRAINT "Order_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("id", "clientId", "token", "status", "slotId", "createdAt", "confirmedAt", "message")
SELECT
    "id",
    "clientId",
    "token",
    "status",
    "slotId",
    "createdAt",
    "confirmedAt",
    "message"
FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_token_key" ON "Order"("token");
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");
CREATE INDEX "Order_status_idx" ON "Order"("status");
CREATE INDEX "Order_slotId_idx" ON "Order"("slotId");
CREATE INDEX "Order_clientId_idx" ON "Order"("clientId");
PRAGMA foreign_keys=ON;
