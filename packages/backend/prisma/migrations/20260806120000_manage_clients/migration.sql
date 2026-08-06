-- Client becomes manager-maintained: `name` unique, and an optional unique
-- `phone` for resolving an inbound WhatsApp message to exactly one client.
--
-- Done with ALTER + CREATE INDEX rather than the table rebuild Prisma usually
-- emits for a constraint change. `@unique` is a unique index in SQLite either
-- way, so the result is identical, and not rebuilding means the 61 seeded
-- clients and every Order.clientId pointing at them are never copied — the copy
-- is where a rebuild loses data.
--
-- Safe to add the unique on `name` without a backfill: the live directory was
-- checked first and has no duplicate names, by exact match or ignoring case and
-- surrounding whitespace.
--
-- `phone` is NULL for every existing row. SQLite allows any number of NULLs in a
-- unique index, so "no phone" stays available to all of them.
ALTER TABLE "Client" ADD COLUMN "phone" TEXT;
CREATE UNIQUE INDEX "Client_name_key" ON "Client"("name");
CREATE UNIQUE INDEX "Client_phone_key" ON "Client"("phone");
