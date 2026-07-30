## Why

The production views now show demand, existencia, and the net to produce, with the
net allowed to go negative when existencia exceeds demand. In practice the negative
rows broke the **Total a producir** footer: summing a mix of positive and negative
nets no longer answers "how many units does this line still need to bake" — a
surplus on one product silently cancels out real demand on another.

The manager only ever needs to bake a non-negative number of units. Surplus is not
actionable on a production sheet, so the net to produce should floor at zero.

## What Changes

- **Floor the net to produce at zero.** When existencia meets or exceeds demand, the
  net to produce is `0` instead of a negative number. Demand and existencia are still
  reported raw, so the full breakdown (e.g. 12 needed, 17 in stock, 0 to produce) stays
  visible — only the actionable "to produce" figure is floored.
- **The footer total makes sense again.** Summing the floored nets yields the real total
  units to bake for the line, with no surplus cancelling out demand.
- Products with demand still stay on the list (a fully-covered product shows `0`, not
  omitted); products with no demand are still absent.

## Capabilities

### Modified Capabilities

- `production-totals`: the net to produce floors at zero (never negative); a product
  over-covered by existencia shows `0` to produce rather than a negative surplus.

## Impact

- **Backend**: `getProductionTotals` computes `toProduce = max(0, demand − existence)`.
- **Frontend**: no logic change — the "A producir" column and footer already render and
  sum `toProduce`; a covered product now shows `0` (still styled as the muted, nothing-
  to-bake variant).
- **Shared**: `ProductionTotalItem.toProduce` doc note updated (floored at zero, never
  negative); the field itself is unchanged.
