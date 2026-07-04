## Why

An order link (the tokenized customer URL) currently lives only as long as a fixed
TTL — `ORDER_TOKEN_TTL_HOURS`, defaulting to 4 hours — stamped as `expiresAt` on the
order at creation. That window is disconnected from how the bakery actually batches
work. Since the introduction of production **bloques** (slots), a batch is an explicit,
manually-closed entity: the manager opens orders into the current bloque and closes it
when the run is done. A link's real lifetime is "until this batch is closed", not "four
hours from when I pressed the button". The two boundaries routinely disagree — a link
can die mid-batch while the bloque is still taking orders, or linger valid after the
bloque has been closed and the run shipped.

This change makes a link valid for exactly as long as the bloque it was created in stays
open. Closing a bloque expires every unused (still `pending`) link in it in the same
atomic operation that closes it. The fixed TTL, its config knob, and the `expiresAt`
column go away entirely — the bloque's open/closed state is now the single source of
truth for link validity.

## What Changes

- **Link validity is slot-scoped, not time-boxed.** A token is valid only while its order
  is still `pending` **and** the bloque that order belongs to is still `open`. There is no
  time-based expiry anymore.
- **Closing a bloque expires its unused links.** `closeSlot` atomically transitions every
  still-`pending` order in the closing bloque to `ignored`, in the same transaction that
  marks the bloque `closed` and opens the next one.
- **Remove the fixed TTL.** Delete `computeExpiry`/`getTokenTtlHours`, the
  `ORDER_TOKEN_TTL_HOURS` env var (README + `.env.example`), and the `Order.expiresAt`
  column. The active expiry sweep is repurposed from "TTL elapsed" to a backstop that
  reconciles any `pending` order left in a `closed` bloque → `ignored`.
- **BREAKING** (API): `CreateLinkResponse` drops `expiresAt` and gains `slotSeq` — the
  human-facing sequence number of the bloque the link is valid for. The `Order` shared
  model drops `expiresAt`.
- **Frontend:** the link modal replaces "expira {timestamp}" with the bloque it is valid
  for — "válido durante el bloque #{seq}".

## Capabilities

### Modified Capabilities

- `order-links`: token validity is redefined from a fixed expiry window to the open/closed
  state of the token's bloque; the short-lived requirement becomes a slot-scoped one.
- `production-slots`: closing a bloque now additionally expires every unused link that
  belongs to it, as part of the same atomic close.
- `order-intake-presentation`: the customer order page reaches the branded invalid-link
  state not only on load but also when an in-progress confirmation is rejected because the
  link went invalid mid-form (its bloque was closed), instead of failing silently.

## Impact

- **Data**: migration `20260703150000_drop_order_expires_at` rebuilds `Order` without the
  `expiresAt` column (SQLite RedefineTable), preserving all other columns and indexes.
- **Backend**: `token.service.isValid` consults the order's `slot.status` instead of
  `expiresAt`; `findOrderByToken` includes the slot. `slots.service.closeSlot` flips the
  bloque's `pending` orders to `ignored` in-transaction. `expiry.service.sweepExpired`
  targets `pending` orders whose slot is `closed`. `config/token.config.ts` deleted; its
  two call sites (`links.service`, `orders.service.createOrder`) drop the expiry stamp.
- **Shared**: `CreateLinkResponse.expiresAt` → `slotSeq: number`; `Order.expiresAt` removed.
- **Frontend**: `CreateOrderModal` link step shows the bloque number instead of a timestamp.
