-- CreateTable
CREATE TABLE "SlotExistence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slotId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    CONSTRAINT "SlotExistence_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SlotExistence_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SlotExistence_slotId_idx" ON "SlotExistence"("slotId");

-- CreateIndex
CREATE UNIQUE INDEX "SlotExistence_slotId_productId_key" ON "SlotExistence"("slotId", "productId");
