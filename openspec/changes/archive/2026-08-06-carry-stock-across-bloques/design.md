## Context

Three per-bloque figures already exist and never meet:

- `SlotExistence(slotId, productId, quantity)` — one row per product, replace-all,
  open-bloque only, rejects negatives, drops zeros. Read via
  `GET /slots/:id/existence`.
- `SlotProduced` — one row per recorded batch; a product's figure is the SUM of
  its rows (`getProducedMap`).
- Demand — summed inside `OrdersService.getProductionTotals`, which walks the
  bloque's orders and their items.

`SlotsService.closeSlot` is today a pure lifecycle operation: mark closed, open
the next, all in one transaction, backstopped by a partial unique index.

Module direction matters: `OrdersModule` imports `SlotsModule` and
`SlotsService` is exported. Nothing flows the other way.

## Goals / Non-Goals

**Goals:**
- Make "how much do I have right now" answerable on screen, per product.
- Continue the count across a close instead of restarting it.
- Make the loss of a shortfall a deliberate, visible decision.
- Keep stock inicial exactly what it is today: manual, editable, never negative.

**Non-Goals:**
- Storing stock actual. It is three numbers added up; storing it would create a
  fourth that can disagree with them.
- Carrying producción real. The new bloque starts with no entries; what mattered
  from the old one is already inside the carried initial.
- Reopening a closed bloque. There is no such concept and this change does not
  add one.
- Showing negative stock actual in the stock dialog. Shortfalls are visible where
  they are actionable — the production views and the orders list.

## Decisions

### Stock actual is derived, and that is what makes it read-only

`stock actual = stock inicial + producción real − pedidos`. There is no column, no
write path and no validation for it, so "not editable" needs no enforcing — the
UI simply has nothing to submit. Each of its three inputs keeps its own control,
which is where a correction belongs.

Worth noticing, and worth stating in the spec as an invariant: this is the exact
negative of the un-floored quantity to produce. `toProduce = max(0, −stockActual)`.
The two can never disagree because they are one subtraction read from either end,
and a positive stock actual is precisely the surplus that `toProduce`'s floor
throws away today.

### The demand aggregation moves to `SlotsService`

The carry needs demand, which lives in `OrdersService`. `SlotsService` cannot
depend on it — `OrdersModule` already imports `SlotsModule`, so that would close a
cycle, and `forwardRef` would paper over a design question rather than answer it.

The other direction is free. Demand-per-bloque is not really an *orders* concern;
it is a fact about a bloque, computed from the orders in it. So `getDemandMap`
moves into `SlotsService` and `getProductionTotals` calls it. One implementation,
no cycle, and the alternative — summing order items in two places — would be two
implementations of the same rule waiting to drift apart.

### A dedicated stock endpoint rather than merging on the page

The obvious cheap option is to let the orders page fetch the pieces it is missing
and combine them client-side. It does not work cleanly, because the three sources
disagree about which products they mention:

- production totals omit every product with no demand;
- the existencia list only mentions products with a row;
- the produced history only mentions products with a batch.

A product baked but never ordered and never counted appears in exactly one of the
three. Combining them is a three-way union — the kind of thing that is fine until
the day it silently drops a row, in a screen whose whole job is to be trusted.

So `GET /slots/:id/stock` returns the merged view, and the rule for which products
appear lives in one testable place instead of in a component.

### Closing carries, and the warning is advisory

`closeSlot` computes each product's stock actual and writes the positive ones as
`SlotExistence` rows on the bloque it opens, inside the same transaction that
closes and opens. A negative is clamped to zero rather than carried: stock inicial
is a counted quantity and cannot be negative, and a carried debt would make the
next bloque produce units no order asks for.

Clamping silently would be the wrong shape, so `GET /slots/close-preview` reports
which products are short, and the UI confirms before closing. The guard is
deliberately **advisory, not enforced**: the server clamps the same way whether or
not anyone looked first. Enforcing it would mean a two-phase close — a token, or a
409 carrying a payload — and that is machinery for a race that one manager on one
screen cannot run.

### Closed bloques become immutable

`deleteOrder` and `replaceItems` gain a bloque-status guard. This is not tidiness:
the carried initial was computed from the closing bloque's demand, so letting that
demand change afterwards leaves the two disagreeing with nothing to detect it. The
alternatives were recomputing forward through every later bloque, or accepting
silent drift.

Existencia and producción real already reject closed bloques; this brings orders
in line, and the UI stops offering the controls at all rather than letting the
manager discover the rule by hitting it.

## Risks / Trade-offs

- **`closeSlot` stops being trivial.** It is the operation guarding the
  one-open-bloque invariant, and it now does real work. The carry goes inside the
  existing transaction so a failure rolls the whole close back; the partial unique
  index still backstops a double-close race.
- **The first close after this ships carries everything at once**, including
  products the manager never counted, because producción real now feeds the
  initial. Expected, but surprising the first time.
- **A shortfall is lost on confirm.** Covered in the proposal; the warning is the
  mitigation.
- **Correcting history is no longer possible.** A mistaken order in a closed
  bloque stays. The fix is forward: the carried initial is editable on the new
  bloque.
- **Preview and close are two calls**, so a change landing between them would make
  the warning stale. Single operator, and the clamping is deterministic either
  way, so the worst case is a warning that listed one product too many.
