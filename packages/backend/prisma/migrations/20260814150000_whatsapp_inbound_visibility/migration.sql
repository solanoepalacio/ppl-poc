-- Records why the agent did what it did with each inbound message.
--
-- The agent is silent for several different reasons — not an order, no verdict,
-- switched off — and every one of them looks the same in the chat. Until now the
-- only durable record was a row saying a message arrived, so "the classifier
-- decided not to reply" and "the model was unreachable all afternoon" were the
-- same row.
--
-- ALTER TABLE rather than the table rebuild Prisma generates for SQLite. All
-- three columns are nullable with no default, so nothing is backfilled and no
-- existing row changes: rows written before this migration keep null in all
-- three, which reads correctly as "we did not record it" rather than as a
-- verdict we never reached.
ALTER TABLE "WhatsappInbound" ADD COLUMN "text" TEXT;
ALTER TABLE "WhatsappInbound" ADD COLUMN "intent" TEXT;
ALTER TABLE "WhatsappInbound" ADD COLUMN "abstainReason" TEXT;
