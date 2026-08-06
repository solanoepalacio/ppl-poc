## Why

The stock control hides a product whose stock actual is negative. That was a
deliberate call when the two-figure view was built: a shortfall is acted on from
the production views, which is where it turns into something to bake, so the
stock control was kept to what is on hand.

In practice it reads as the control lying. A product with no stock inicial and an
order for one has a stock actual of −1 — a real position, computed by the same
formula as every other row — and the one screen whose subject is stock is the one
screen that does not show it. The manager has to know the product is missing
before they can go and find out that it is missing.

## What Changes

- **A product with a stock actual other than zero is listed**, whatever its sign.
  The example that prompted this — stock inicial 0, one unit ordered — now reads
  `inicial 0 · actual −1` rather than being absent.
- **A product with a stock inicial above zero stays listed** even when its stock
  actual lands exactly on zero. It is only hidden when *both* figures are zero,
  which is the case where there is nothing to say. Without this, typing an
  initial that demand happens to consume exactly would make the row — and the
  figure just typed — vanish.

## Capabilities

### Modified Capabilities
- `production-slots`: the stock-control requirement changes which products it
  lists. Removed and re-added rather than amended: one of its scenarios is named
  *A product in shortfall is not listed* and now asserts the opposite.

## Impact

- **Frontend only.** The API already returns every product with any activity —
  shortfalls included, deliberately, so that adding one from the search showed a
  truthful figure. Only the dialog's own filter changes.
- **Removes a dead filter from the backend.** `stockOf` also returned a
  pre-filtered `items` encoding the old rule; nothing has read it since
  `getStock` started returning the unfiltered set. Left in place it is a second,
  now-wrong answer to "which products does the stock control list".
- **The close-shortfall warning is unaffected.** It reads its own preview and
  keeps listing exactly the products about to lose a shortfall.
- **The control will list more rows than before** on a bloque with orders for
  products nobody counted — which is the point, but it is a longer list.
