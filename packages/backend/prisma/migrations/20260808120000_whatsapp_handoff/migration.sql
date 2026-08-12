-- Conversations the agent has handed over to a person. While a row's expiresAt is
-- in the future the agent says nothing to that customer at all.
--
-- Purely additive: a new table, nothing existing touched, nothing backfilled.
CREATE TABLE "WhatsappHandoff" (
    "sender" TEXT NOT NULL PRIMARY KEY,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);

CREATE INDEX "WhatsappHandoff_expiresAt_idx" ON "WhatsappHandoff"("expiresAt");
