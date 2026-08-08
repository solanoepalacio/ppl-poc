-- Records the inbound WhatsApp messages the agent has acted on, so a redelivery
-- does not become a second order link. Meta retries until acknowledged for up to
-- seven days, so this has to outlive the process.
--
-- Purely additive: a new table, no existing table touched, nothing backfilled.
CREATE TABLE "WhatsappInbound" (
    "wamid" TEXT NOT NULL PRIMARY KEY,
    "from" TEXT NOT NULL,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "replied" BOOLEAN NOT NULL DEFAULT false
);

-- The suppression window asks "did we reply to this sender recently", which is a
-- range scan over one sender's messages.
CREATE INDEX "WhatsappInbound_from_receivedAt_idx" ON "WhatsappInbound"("from", "receivedAt");
