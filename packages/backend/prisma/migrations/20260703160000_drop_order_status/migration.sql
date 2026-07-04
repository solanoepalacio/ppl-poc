-- Remove the "status" column from Order. The 5-value order lifecycle
-- (pending/issued/denied/ignored/finished) was a premature optimization; the app
-- only needs the single-use gate that `status = 'pending'` used to encode. That is
-- replaced by a nullable "consumedAt": a token is valid only while consumedAt is
-- null and its bloque is open. Confirming an order and choosing the WhatsApp
-- fallback both consume the link.
--
-- SQLite cannot DROP/ADD a column on a populated table cleanly, so this uses the
-- standard Prisma RedefineTable dance: build new_Order without "status" and with
-- "consumedAt", copy every other column across (backfilling consumedAt from the old
-- status), swap it in, and recreate the indexes (dropping "Order_status_idx").
--
-- Backfill: a still-`pending` order was never consumed (consumedAt NULL); any other
-- status means the link was spent, so mark it consumed with confirmedAt when present
-- (confirm path) else createdAt (any non-null instant closes the gate).

-- RedefineTable: rebuild Order without "status", adding nullable "consumedAt".
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" DATETIME,
    "consumedAt" DATETIME,
    "message" TEXT,
    CONSTRAINT "Order_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("id", "clientId", "token", "slotId", "createdAt", "confirmedAt", "consumedAt", "message")
SELECT
    "id",
    "clientId",
    "token",
    "slotId",
    "createdAt",
    "confirmedAt",
    CASE WHEN "status" = 'pending' THEN NULL ELSE COALESCE("confirmedAt", "createdAt") END,
    "message"
FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_token_key" ON "Order"("token");
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");
CREATE INDEX "Order_slotId_idx" ON "Order"("slotId");
CREATE INDEX "Order_clientId_idx" ON "Order"("clientId");
PRAGMA foreign_keys=ON;
