## Why

The production views (**Producción salados** and **Producción dulces**) already
account for the bloque's *existencia* (stock on hand): each product's number is the
demand summed across the bloque's orders **minus** its existencia, floored at zero,
and any product fully covered by existencia drops off the list entirely. But that
single net number hides its own inputs. Standing at the oven, the baker sees only
"produce 5" — not that 8 were ordered and 3 are already in stock — and a product
that is fully covered simply vanishes, indistinguishable from one nobody ordered.

The manager wants each production view to show the full breakdown for every ordered
product: **what is needed** (demand), **what already exists** (existencia), and **the
difference** (net to produce), so the numbers can be trusted and checked at a glance.

## What Changes

- **Report all three figures per product.** `GET /orders/production` returns, for each
  product with demand, its summed **demand**, its recorded **existencia**, and the net
  **to produce** — instead of a single collapsed "quantity".
- **Stop hiding covered products.** A product with demand stays in the totals even when
  existencia meets or exceeds it. Only products with *no* demand are omitted, as before.
- **Show surplus as a negative net.** The net to produce is no longer floored at zero:
  when existencia exceeds demand the difference is negative, signalling surplus stock
  rather than disappearing.
- **Three-column production views.** Each production view renders **Necesario** (demand),
  **Stock** (existencia), and **A producir** (the difference) per product, replacing the
  single "Cantidad a producir" column. The footer totals the units still to produce.

## Capabilities

### Modified Capabilities

- `production-totals`: production totals now expose demand, existencia, and the net to
  produce per product; the net may be negative; products with demand are never dropped
  for being covered; the two production views surface all three figures.

## Impact

- **Shared**: `ProductionTotalItem` replaces its single `quantity` field with `demand`,
  `existence`, and `toProduce` (the last may be negative).
- **Backend**: `getProductionTotals` carries demand and existencia through per product and
  emits `toProduce = demand − existence` without flooring; it no longer filters out
  covered products (only products with no demand are absent, which is inherent to summing).
- **Frontend**: `ProductionView` renders a three-number row (Necesario / Stock / A producir)
  and totals `toProduce` in the footer; surplus rows are styled distinctly.
- **Data / API surface**: no schema or route change — existencia already lives in
  `SlotExistence` and is edited via the orders view's stock editor; only the production
  response shape and the production views change.
