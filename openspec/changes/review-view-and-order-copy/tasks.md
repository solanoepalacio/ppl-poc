## 1. Revisar Pedidos stops scrolling itself

- [x] 1.1 Drop `<AutoScroll />` and its import from the review page; keep
  `<AutoRefresh />`.
- [x] 1.2 Fix the page's doc comment, which explains both.
- [x] 1.3 Leave `AutoScroll` where it is — the two production views still use it,
  and it is no longer specific to one view's folder.

## 2. The order summary carries the notice

- [x] 2.1 `OrderForm.tsx`: show the review notice whenever the summary is open,
  not only once the confirm has been pressed.
- [x] 2.2 Restyle it as the header's by-unit notice — red, bordered, on white —
  so the two read as the same kind of instruction rather than one looking like a
  passing alert.
- [x] 2.3 Keep `role="alert"` off it now that it is always present: an alert that
  is there from the start is not an alert, and it would be announced on load.
  The text alone carries it.

## 3. Shorter pause

- [x] 3.1 `REVIEW_PAUSE_SECONDS` from 5 to 3.

## 4. Verify

- [x] 4.1 Frontend `lint`.
- [x] 4.2 The review page does not move on its own with a list that overflows,
  and still picks up a new order by itself.
- [x] 4.3 The customer form shows the notice with the summary before any confirm,
  in the header's red, and the pause counts 3, 2, 1.
