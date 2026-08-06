## 1. Summary follows the order of entry

- [x] 1.1 `OrderForm.tsx`: hold the added products as an ordered list of product
  ids alongside `quantities`, appending on the zero → positive transition and
  removing on the positive → zero one. Order of entry is not derivable from
  `quantities` — a `Record` has no meaningful order and re-keying it would not
  survive a clear-and-retype — so it has to be tracked as it happens.
- [x] 1.2 Build `chosen` from that list instead of sorting the catalog by name,
  and drop the sort. Keep the `quantity > 0` filter as the guard it is: the list
  and the quantities are two pieces of state and the render should not trust them
  to agree.
- [x] 1.3 Leave `CatalogList`'s own alphabetical sort alone — the list the
  customer scrolls has to be findable by name.
- [x] 1.4 Fix the `chosen` doc comment, which currently explains why the summary
  is alphabetical.

## 2. The review gate

- [x] 2.1 `OrderForm.tsx`: add the gate's state — whether the review has been
  done, and whether the pause is currently running.
- [x] 2.2 Split the confirm handler: with the review not yet done, open the
  summary, raise the notice, start the pause and return without submitting;
  otherwise submit as today.
- [x] 2.3 Drive the label from the pause (`Revisar pedido...n` while it runs,
  `Confirmar pedido` otherwise) and add the pause to the button's `disabled`
  condition, alongside `busy` and the empty order.
- [x] 2.4 Run the pause as a one-second countdown so the label can show the time
  left. Hold it as a single `secondsLeft` — `null` before the review is raised, a
  positive number while it runs, zero once elapsed — and derive both "counting
  down" and "already reviewed" from it, so the two cannot contradict each other.
  Ticking from an effect keyed on the value means its cleanup covers unmount too,
  so a customer who leaves mid-pause cannot leave a timer to fire on a dead
  component, and no ref is needed to hold the handle.
- [x] 2.5 Render the notice inside the summary panel, above the heading, with
  `role="alert"` so it is announced. Placing it there is what makes "the summary
  is already open, so only the notice appears" fall out of the markup instead of
  needing a second code path — and collapsing the summary takes the notice with
  it, which is right: the notice is about the list it sits on.
- [x] 2.6 Add the two strings to `COPY`.

## 3. Styling

- [x] 3.1 `globals.css`: style the notice so it reads as a warning inside the
  summary panel — legible against the panel, WCAG AA, and not signalled by color
  alone (it is a sentence of text, so this holds by construction).
- [x] 3.2 Check the action bar still fits a phone viewport with the notice, the
  summary and the button all present, and that the notice does not push the button
  off screen. **It did.** The notice adds ~68px to a bar that was
  `flex-shrink: 0` around a list capped at a fixed `34vh`, so bar + list + notice
  could exceed the viewport: at 360×640 with 8 products the button ended 28px
  below the fold, at 320×568 it was 10px below with only 3.
- [x] 3.3 Fix it structurally rather than by retuning the cap. The bar is now a
  shrinkable flex column whose summary list is the one part that gives, so the
  button is the last thing to lose room whatever the notice's height — a `34vh`
  number chosen against the notice's pixel height would drift with viewport and
  font. Measured across 320/360/390/1280 at 3, 8 and 20 products: the button is
  fully on screen in every case and the list still scrolls to its last row.
- [x] 3.4 This also fixed a **pre-existing** overflow with no notice involved:
  320×568 with 8 products already put the button 8px below the fold before this
  change.

## 4. Verify

- [x] 4.1 `lint` on the frontend.
- [x] 4.2 Drive the entry order in the browser: type quantities on three products
  out of alphabetical order and confirm the summary lists them as typed; change
  one quantity and confirm it holds its place; clear one and retype it and confirm
  it moves to the end.
- [x] 4.3 Drive the gate from a collapsed summary: first press submits nothing,
  the summary opens, the notice shows, the button reads `Revisar pedido...n` and is
  disabled; after 5 seconds it reads `Confirmar pedido` and is enabled; pressing
  it submits and the success state appears. Use a scratch token, not one the
  bakery needs.
- [x] 4.4 Drive the gate from an already-open summary: the notice appears, the
  summary is not disturbed, and the pause runs the same way.
- [x] 4.5 Confirm the pause does not re-arm: after a successful review, changing a
  quantity and pressing confirm submits without a second pause.
- [x] 4.6 Confirm the order reaches the back office with the right products and
  quantities — the gate must not have changed the payload.
- [x] 4.7 Sample the button's label and `disabled` state through the whole pause
  and confirm it counts 5, 4, 3, 2, 1 — disabled the whole way — and that the
  total is still ~5s rather than 5 ticks plus drift. Measured 5159 ms.
- [x] 4.8 Confirm the longer label does not wrap or grow the button at 320px, the
  narrowest viewport supported.
