## Context

A "link" is not its own table: it is the `token` on an `Order`, plus the order's `status`
and (today) `expiresAt`. Every order already records the bloque it was created in via a
required `slotId` FK. So the link→slot association we need already exists in the data —
this change re-points *validity* at it and retires the parallel TTL mechanism.

Three code points govern link lifetime today, all keyed on `expiresAt`:

1. `token.service.isValid` — the read-path predicate (`pending && now < expiresAt`).
2. `expiry.service.sweepExpired` — a 60s `@Interval` that actively flips expired `pending`
   orders to `ignored` (kept active, not lazy, so `GROUP BY status` metrics stay honest).
3. `config/token.config.computeExpiry` — stamps `expiresAt` at creation.

## Goals

- A link is valid iff its order is `pending` **and** its bloque is `open`.
- Closing a bloque is the moment unused links die — actively, in the close transaction.
- No time-based expiry, no TTL config, no `expiresAt` column.

## Decisions

### Validity = pending AND slot open (belt-and-suspenders with the close flip)

`isValid` becomes `order.status === 'pending' && order.slot.status === 'open'`. Because
`closeSlot` also flips the bloque's `pending` orders to `ignored`, in steady state a
`pending` order always sits in an `open` bloque, so the slot check is technically
redundant with the status check. We keep it anyway: it makes `isValid` self-contained and
correct *independently* of whether the active flip has run, so the read path can never
serve a link from a closed bloque even in a race or after a partial write. `isValid` stays
the single source of truth; `findOrderByToken` includes the slot so callers don't have to.

### Closing a bloque expires its links, atomically

The expiry moment is the close, so it belongs in the close transaction. `closeSlot` adds
`tx.order.updateMany({ where: { slotId: id, status: 'pending' }, data: { status:
'ignored' } })` between marking the bloque `closed` and opening the next one. This is the
"active mechanism" the project requires for the `ignored` transition — it is a manager
action, not a lazy relabel — so metrics (`placed` vs `ignored`) stay reliable.

### The sweep becomes a backstop, not the primary mechanism

With the close flip in place, the `@Interval` sweep is no longer *the* expiry mechanism —
but we keep it, repurposed, as a cheap reconciliation backstop: flip any `pending` order
whose slot is `closed` → `ignored`. In normal operation it finds nothing (the close
already handled them); it exists to self-heal a `pending` row that somehow escaped the
transaction (e.g. manual DB edits, a future code path that closes a slot without the
flip). Removing it would trade a five-line safety net for silent metric rot, so it stays.

### Remove the TTL surface entirely — no absolute cap

Per the product decision, validity is *purely* slot-driven: a bloque that stays open for a
week keeps its links live for a week. There is no secondary max-age cap. That lets us
delete `token.config.ts`, the `ORDER_TOKEN_TTL_HOURS` env var, and the `expiresAt` column
outright rather than keeping a vestigial fallback. The manual-order-creation path
(`createOrder`) only set `expiresAt` to satisfy the NOT NULL column; with the column gone
that line disappears — those orders are created non-`pending` anyway, so token validity
never applied to them.

### Contract: surface the bloque, not a timestamp

`CreateLinkResponse` drops `expiresAt` and gains `slotSeq: number`, the human-facing
sequence of the open bloque the link belongs to. The manager UI shows "válido durante el
bloque #{seq}" — an honest statement of the link's lifetime — instead of a fixed clock
time that no longer exists. `links.service.createLink` already resolves the open slot; it
now reads the whole slot (for `seq`) rather than just the id.

## Migration

`20260703150000_drop_order_expires_at` uses the SQLite RedefineTable dance (create
`new_Order` without `expiresAt`, copy every other column, drop, rename, recreate the
`token` unique index and the `createdAt`/`status`/`slotId` indexes). No data is lost beyond
the retired column; existing `pending` orders keep validity governed by their bloque.

## Risks / Trade-offs

- **A forgotten-open bloque keeps links live indefinitely.** Accepted: it mirrors reality
  (the batch is still open) and matches the product decision. The manager closing the
  bloque — which they already do per run — is the remedy.
- **Redundant slot check on every validation read.** One extra joined column on a
  single-row `findUnique`; negligible, and it buys race-proof correctness.
