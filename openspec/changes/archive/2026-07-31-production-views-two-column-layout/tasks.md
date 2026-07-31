## 1. Two-table split

- [x] 1.1 `ProductionView.tsx`: split `production.items` into two arrays by
  index parity — even indices to the left table, odd to the right — so
  consecutive products alternate between them and an odd count leaves the extra
  row on the left.
- [x] 1.2 Render the two tables inside a wrapper element, each with its own head
  row, replacing the single full-width table. Keep the empty state ("Nada que
  producir en el bloque #N") as one message for the whole view rather than one
  per table.
- [x] 1.3 `globals.css`: lay the wrapper out as a two-column grid with a gap,
  collapsing to a single column below a narrow breakpoint so product names never
  get squeezed to unreadable widths.

## 2. Reduced columns

- [x] 2.1 `ProductionView.tsx`: drop the "Necesario" and "Stock" head cells and
  their row cells, leaving "Producto" and "A producir". The API response still
  carries `demand` and `existence` — they are the inputs to `toProduce` and are
  deliberately left in the payload, just not rendered.
- [x] 2.2 `globals.css`: narrow `.ptable`'s grid from
  `minmax(0, 1fr) 220px` to a two-cell layout sized for the halved width.

## 3. Alternating row colour

- [x] 3.1 Alternate each row's treatment by its position **within its own
  table**, so both tables start on the same colour and stay in step across the
  screen (driving it from the global index would put them out of phase).
- [x] 3.2 Use the brand slate and the standard ink as the two colours, and
  confirm both clear WCAG AA against the row background rather than assuming it.
- [x] 3.3 Extend the treatment to the row background as a **soft** tint of the
  same family, so the rows stay a subdued backdrop rather than competing with
  the numbers.
- [x] 3.4 Make the quantity chip's background the row's own name colour, with the
  number in white. Confirm the number clears WCAG AA against the chip.

## 4. No line total

- [x] 4.1 ~~Pinned total~~ — superseded: the total is removed entirely.
- [x] 4.2 Remove the total element from `ProductionView.tsx`, its `.ptotal-*`
  styles, and the bottom padding that was reserved so it would not cover the last
  row.

## 4b. Header line

- [x] 4b.1 Replace both views' supporting line with **"Cantidades a producir
  según pedidos"** (the same on each) and render it larger.
- [x] 4b.2 Scope the larger size to the production views via a modifier on
  `ViewHeader`, so the orders view's header is unchanged.

## 5. Verification

- [x] 5.1 Frontend typecheck.
- [x] 5.2 Drive it with exactly two products in the line and confirm one lands in
  each table.
- [x] 5.3 Drive it with an odd number of products and confirm the alternation is
  correct and the extra row sits on the left.
- [x] 5.4 Drive it: confirm each row shows only the product name and the quantity
  to produce, and that no demand or existencia figure appears anywhere on the
  view.
- [x] 5.5 Drive it: confirm consecutive rows differ in text colour, and measure
  the contrast of both colours against the row background against the WCAG AA
  threshold.
- [x] 5.6 Drive it: confirm no total appears anywhere on the view, and that with
  enough products to scroll the last row is fully visible (nothing floats over
  it any more).
- [x] 5.10 Drive it: confirm consecutive rows differ in background as well as
  text, that each chip's background matches its row's name colour, and measure
  the contrast of name-on-background and number-on-chip for both treatments.
- [x] 5.11 Drive it: confirm both views show "Cantidades a producir según
  pedidos" at the larger size, and that the orders view's header is unchanged.
- [x] 5.7 Drive it: confirm the view still auto-refreshes (the change must not
  break `AutoRefresh`), still shows only its own category, and still offers no
  bloque selector.
- [x] 5.8 Drive it at a narrow viewport and confirm the layout collapses to one
  column instead of squeezing the names.
- [x] 5.9 `openspec validate production-views-two-column-layout --strict`, then
  dry-run the archive against a throwaway copy of `openspec/`, in both orders
  relative to `production-totals-auto-refresh` since both touch this capability.

## 7. Type sized for the room

The display is a 32" screen read from about 4 m. At that distance signage needs a
cap height of roughly 20 mm, which on a 397 mm-tall panel is about 7% of the
screen height — far above the 15.5px the rows started at.

- [x] 7.1 Introduce `--prod-name-size` / `--prod-qty-size` so both sizes are
  tuned from one place, and apply them to the product name and the quantity chip
  inside `.ptable-split` only (the orders view keeps its own type).
- [x] 7.2 Express them in `vh`, not `px`: the physical size on the panel then
  does not depend on whether the TV's browser reports a 1280- or 1920-wide CSS
  viewport. Verified by measuring the same `vh` value at both resolutions and
  confirming the resulting millimetre height matches.
- [x] 7.3 Widen the numeric column from the quantity size so a large number never
  crowds the product name.
- [x] 7.4 Measure the resulting cap height in millimetres for several candidate
  sizes and pick one that reads at ~4 m, recording the cost in products visible
  per screen (the rest is reached by the self-scrolling).
