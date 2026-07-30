-- Introduce the production "bloque" (Slot) entity and slot every existing order.
-- Backfill strategy: one CLOSED bloque per distinct historical day (grouped by
-- createdAt in server-local time), seq assigned chronologically, plus one fresh
-- OPEN bloque that new orders will land in.
--
-- NOTE ON TIMESTAMPS: Prisma stores SQLite DateTime as INTEGER epoch-milliseconds
-- (not text), so every timestamp written here is an integer ms value and day
-- grouping uses `createdAt/1000` with the 'unixepoch' modifier. Writing text
-- dates would break Prisma's DateTime deserialization on read.

-- CreateTable: Slot
CREATE TABLE "Slot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seq" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "Slot_seq_key" ON "Slot"("seq");
CREATE INDEX "Slot_status_idx" ON "Slot"("status");

-- Enforce the single-open-bloque invariant at the DB level as a backstop to the
-- application logic (ensureOpenSlot + transactional closeSlot). Prisma's schema
-- DSL cannot express a partial index, so it lives only here.
CREATE UNIQUE INDEX "Slot_single_open" ON "Slot"("status") WHERE "status" = 'open';

-- Backfill: one closed bloque per distinct local day of existing orders, numbered
-- chronologically. Deterministic ids ('slot_' || day) so the Order rebuild below
-- can reference them without a join back. openedAt/closedAt use the first/last
-- order instant of the day (already integer ms, so no format conversion needed).
INSERT INTO "Slot" ("id", "seq", "status", "openedAt", "closedAt")
SELECT
    'slot_' || d.day,
    ROW_NUMBER() OVER (ORDER BY d.day),
    'closed',
    d.opened,
    d.closed
FROM (
    SELECT
        date("createdAt" / 1000, 'unixepoch', 'localtime') AS day,
        MIN("createdAt") AS opened,
        MAX("createdAt") AS closed
    FROM "Order"
    GROUP BY date("createdAt" / 1000, 'unixepoch', 'localtime')
) d;

-- The fresh open bloque, numbered right after the historical ones. openedAt is
-- "now" in epoch ms.
INSERT INTO "Slot" ("id", "seq", "status", "openedAt", "closedAt")
VALUES (
    'slot_open_initial',
    (SELECT COUNT(DISTINCT date("createdAt" / 1000, 'unixepoch', 'localtime')) FROM "Order") + 1,
    'open',
    CAST(strftime('%s', 'now') AS INTEGER) * 1000,
    NULL
);

-- RedefineTable: add NOT NULL "slotId" + FK to Order. SQLite can't ADD a NOT NULL
-- column without a default on a populated table, so rebuild the table and backfill
-- slotId from each order's day-bloque during the copy.
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "slotId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" DATETIME,
    "message" TEXT,
    CONSTRAINT "Order_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("id", "phone", "token", "status", "slotId", "expiresAt", "createdAt", "confirmedAt", "message")
SELECT
    "id",
    "phone",
    "token",
    "status",
    'slot_' || date("createdAt" / 1000, 'unixepoch', 'localtime'),
    "expiresAt",
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
PRAGMA foreign_keys=ON;
