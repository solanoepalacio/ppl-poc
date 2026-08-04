## Why

The bakery's stock is a running quantity: what was on the shelf, plus what came
out of the oven, minus what went out the door. The system only models the first
of those. *Existencia* is a number the manager types once at the start of a
bloque and it never moves again, however much is baked or ordered during it.

So the manager has no way to ask "how much of this do I have right now?" — the
three figures that answer it exist, but only ever separately, and the arithmetic
happens in someone's head. Worse, when a bloque closes, whatever was left over
is simply forgotten: the next bloque starts at zero everywhere and the manager
re-types the counts by hand, if they remember to.

There is a second, quieter loss. Producing more than was ordered is normal, and
the surplus currently vanishes: `toProduce` floors at zero, so baking 300 against
a demand of 200 leaves 100 units the system never hears about again.

## What Changes

- **Existencia becomes *stock inicial*** — the same field, the same manual entry,
  named for what it actually is now that a second figure exists beside it.
- **Add *stock actual*, derived and never stored**:
  `stock inicial + producción real − pedidos`, computed per product per bloque.
  It is not editable, because there is nothing to edit: it is a view of three
  numbers that each have their own control.
- **Show both in the stock dialog.** It lists every product with a stock inicial
  above zero *or* a stock actual above zero — so a product never given an initial
  count still appears once it has been produced. Editing the initial recomputes
  the current figure live.
- **Carry the stock actual across the close.** Closing a bloque writes each
  product's stock actual as the *stock inicial* of the bloque it opens, so the
  count continues instead of restarting.
- **Warn before closing with a shortfall.** Stock actual can be negative — real
  production is recorded after the orders come in — but a stock inicial never is.
  A negative therefore cannot carry, and closing would silently discard it. The
  close first shows which products are short and offers to go ahead or cancel.
- **Freeze closed bloques.** Editing or deleting an order in a closed bloque is
  now rejected. It has to be: the carried figure was computed from that bloque's
  demand, and changing the demand afterwards would leave the two disagreeing with
  nothing to notice it.

## Capabilities

### Modified Capabilities
- `production-slots`: renames existencia to stock inicial and drops its
  start-at-zero guarantee, which the carry replaces; adds the derived stock
  actual; extends closing to carry it; adds the shortfall warning; extends the
  stock dialog to show both figures.
- `order-management`: restricts editing and deleting an order to the open bloque.

## Impact

- **Backend:** `SlotsService` gains the demand aggregation (moved here from
  `OrdersService`, which keeps using it) and the stock computation; `closeSlot`
  stops being a pure lifecycle operation and now writes the next bloque's initial
  stock inside the same transaction. Two endpoints: the stock view and the close
  preview. Guards on `deleteOrder` and `replaceItems`.
- **Frontend:** the stock dialog gains a second, read-only figure per row and a
  new set of rows; `CloseSlotButton` gains a confirmation step; `OrderActions`
  learns about the bloque's status.
- **No new table.** Stock actual is derived on read and materialised exactly once
  — at close, as an ordinary, editable `SlotExistence` row on the new bloque.
- **A behaviour people will notice:** correcting a mistaken order in a closed
  bloque used to work and no longer will. That is a real loss of freedom, taken
  deliberately, because the alternative is a carried figure that silently stops
  matching the bloque it came from. The escape hatch is that the *carried* value
  lands as a normal editable initial stock, so a bad carry is fixed forward on the
  new bloque rather than backward on the old one.
- **A shortfall is discarded, not carried.** When the manager confirms a close
  with negative stock actual, that debt is dropped. The unmet demand belongs to
  orders in a bloque that is now closed; carrying it would make the next bloque
  produce goods no order asks for. The warning exists so this is a decision rather
  than an accident.
