-- Client becomes manager-maintained: `name` unique, and an optional unique
-- `phone` for resolving an inbound WhatsApp message to exactly one client.
--
-- Done with ALTER + CREATE INDEX rather than the table rebuild Prisma usually
-- emits for a constraint change. `@unique` is a unique index in SQLite either
-- way, so the result is identical, and not rebuilding means the seeded clients
-- and every Order.clientId pointing at them are never copied — the copy is
-- where a rebuild loses data.
--
-- ORDER MATTERS. The name index is first because it is the only statement here
-- that can fail: a database whose directory already holds two clients with the
-- same name rejects it. Running it first means such a failure leaves the schema
-- exactly as it was, so the fix is to dedupe the names and re-run. With the
-- ALTER first, the column would survive the failure while the indexes did not,
-- and Prisma would mark the migration failed — a half-applied state that blocks
-- every later migration and cannot be re-run, because re-adding the column
-- errors in turn. Verified both ways on copies of the real database.
CREATE UNIQUE INDEX "Client_name_key" ON "Client"("name");

-- Cannot fail: every existing row takes NULL, and SQLite allows any number of
-- NULLs in a unique index, so "no phone" stays available to all of them.
ALTER TABLE "Client" ADD COLUMN "phone" TEXT;
CREATE UNIQUE INDEX "Client_phone_key" ON "Client"("phone");
