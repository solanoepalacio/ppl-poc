-- CreateTable
CREATE TABLE "SlotProduced" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slotId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    CONSTRAINT "SlotProduced_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SlotProduced_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SlotProduced_slotId_idx" ON "SlotProduced"("slotId");

-- CreateIndex
CREATE UNIQUE INDEX "SlotProduced_slotId_productId_key" ON "SlotProduced"("slotId", "productId");
