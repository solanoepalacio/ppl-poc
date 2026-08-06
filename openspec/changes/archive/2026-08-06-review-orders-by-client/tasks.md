## 1. The view

- [x] 1.1 `Sidebar.tsx`: a fifth entry, **Revisar Pedidos** → `/revisar-pedidos`,
  below Clientes, with a glyph in the same style.
- [x] 1.2 `(backoffice)/revisar-pedidos/page.tsx`: an async server component
  fetching `getOrdersBySlot(slotId)`, `getProducts()` and `getSlots()` — the same
  three the orders view already uses. Reuse `SlotPicker` with `basePath`, which
  it already takes for exactly this.
- [x] 1.3 Fold the orders into client → product → summed quantity. A plain
  reduction over data already on the page; no endpoint and no backend
  aggregation, since `GET /orders?slotId=` returns every order with its items.
- [x] 1.4 Sort clients by name and each client's products by name: the view is
  looked *up* in (find this client, find that product), so alphabetical beats
  entry order here — unlike the editing dialogs, where the manager is re-reading
  a sequence they just performed.
- [x] 1.5 Render products three to a row on a fixed three-column grid, so a
  partial row keeps its columns instead of stretching.
- [x] 1.6 No client component: nothing on this page has state. It is a server
  component plus the existing `SlotPicker` island.

## 2. Styling

- [x] 2.1 `globals.css`: the client record and the three-column product grid,
  built from the existing back-office tokens.
- [x] 2.2 Collapse to fewer columns on a narrow viewport — three columns of
  "Producto x 200" do not fit a phone, and this view is also opened on one.
  Two columns under 900px, one under 560px.
- [x] 2.3 Size the type for the factory screens, in `vh` like the production
  views so the physical size is the same whatever CSS width the panel reports.
  Measured at 1920×1080: client 37px, product 30px, quantity 37px, against the
  production views' 43/54 — smaller on purpose, since three products across a
  third of the screen wrap at 4vh. At 1280×720: 24/20/24.
- [x] 2.4 Fall back to fixed px below 900px: `vh` type on a short phone viewport
  produces sizes nobody asked for. Measured at 390×780: 19/15/16, one column, no
  horizontal scroll.
- [x] 2.5 Enlarge the header's supporting line too, reusing the rule the
  production views already have for it.

## 3. Verify

- [x] 3.1 Frontend `lint`.
- [x] 3.2 Drive it against the real bloque: quantities per client match the sum
  of that client's orders, checked against `GET /orders` rather than by eye.
- [x] 3.3 Confirm the merge with a client that has several orders including a
  repeated product.
- [x] 3.4 Confirm three per row, that a partial row keeps its columns, and that
  there is no expand control or edit/delete control anywhere.
- [x] 3.5 Confirm the bloque picker works and a closed bloque renders read-only.
- [x] 3.6 Confirm the nav shows five entries and marks this one active.

## 4. Unattended behaviour

- [x] 4.1 Move `AutoRefresh` and `AutoScroll` out of `production/` up to
  `(backoffice)/`: two view folders use them now, and a component shared across
  views should not live inside one of them. Update the doc comments, which speak
  of "a production view".
- [x] 4.2 Render both in the review page. No props and no configuration — the
  refresh interval and the scroll cadence are the ones the production screens
  already run at, and a second set of numbers to keep in step would be worse.
- [x] 4.3 Verify the scroll on a viewport short enough to overflow: reached the
  end of its travel (67 of 67px) and returned, with no document reload.
- [x] 4.4 Verify the refresh live: created an order while the page sat open and
  it appeared on its own after 121s, via one RSC fetch — no document reload, and
  React reconciled into the same DOM node.
- [x] 4.5 Regression-check the two production views after the move, plus the
  other three views. All render, no console errors.

## 5. Reading the view from across the room

- [x] 5.1 ~~Alternate with the production views' full treatment (background, name
  colour, quantity as a filled chip)~~ — rejected on sight: it made this view look
  like a production screen when only the banding was wanted. The name and the
  quantity keep their own plain treatment; **only the background alternates**.
- [x] 5.2 ~~Paint the bands on the cells via `nth-child`~~ — a band drawn on cells
  stops where a short last row runs out of products, leaving the card showing
  through the gap. Group the products into rows in the markup instead and put the
  colour on the row: it covers the full width by construction, and all the
  `nth-child` arithmetic that had to know the column count disappears.
- [x] 5.2b Also rejected: stretching the last cell with `grid-column: auto / -1`.
  It fills the band but auto-placement then throws the product into the **last**
  column, leaving a hole mid-row. Caught in the screenshot, not the measurements.
- [x] 5.3 Verified at 1920 (3 columns), 800 (2) and 500 (1): all 7 bands span the
  full width — including the ones holding a single product — consecutive bands
  alternate, and the text still lines up in 3, 2 and 1 columns respectively.
- [x] 5.6 Add a hairline between bands as well as the colour change. At the first
  value tried it measured 1.31:1 against its band and disappeared at the distance
  this view is read from; 0.32 alpha gives 1.66:1 and is visible without becoming
  a third colour.
- [x] 5.4 Close the gap between a name and its quantity without touching the gap
  between products: 8px inside a cell against the grid's 16px between them.
- [x] 5.5 Lay the cell out as running text rather than a flex row. In flex, a name
  that wraps takes the whole line box and throws the quantity back to the right
  edge — reintroducing, for exactly the long names that need it most, the gap
  this was meant to close. Caught in the screenshot, not by the measurement,
  which reported the wrapped cells as fine.
