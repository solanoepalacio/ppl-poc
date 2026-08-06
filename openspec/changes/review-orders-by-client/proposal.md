## Why

The factory floor needs one question answered: *what did each client order in this
bloque?* The orders view cannot answer it. It lists **orders**, not clients — a
client who ordered three times is three rows — and each row's contents are behind
a click, so reading the bloque means expanding every row and adding the same
product up by hand across them. It is also an editing surface, with delete
controls on every row, which is the wrong thing to hand someone whose job is to
read it while they work.

## What Changes

- **A Revisar Pedidos view** at `/revisar-pedidos`, reached from a fifth
  navigation entry below Clientes.
- **One record per client, not per order.** A client's orders in the bloque are
  merged and the same product summed across them: three orders of 100, 100 and
  100 of two products read as `Producto A x 200` and `Producto B x 100`.
- **Products always visible**, laid out three per row rather than stacked, so a
  client with a dozen products is four lines instead of twelve and more clients
  fit on screen at once.
- **Read-only throughout.** No edit, no delete, no expanding — nothing to press.

## Capabilities

### Added Capabilities
- `order-review-presentation`: the new view.

### Modified Capabilities
- `back-office-navigation`: a fifth destination, **Revisar Pedidos**.

## Impact

- **Frontend only.** `GET /orders?slotId=` already returns every order in a
  bloque with its items and client name, and `GET /products` resolves the names.
  The grouping is a fold over data the back office already fetches — no endpoint,
  no schema, no aggregation added to the backend.
- **The bloque picker comes along**, using the same `?slotId=` URL state as the
  orders view. The view is read-only whichever bloque is chosen, and the factory
  needs to check a bloque that has just closed as often as the open one.
- **Clients with no orders in the bloque are absent.** The view answers what was
  ordered; a client who ordered nothing is not an empty record, it is not a
  record.
- **This overlaps the production views without replacing them.** Those answer
  *how much to bake in total*, deduplicated across clients and net of stock. This
  answers *who gets what*, which is the question at the point of packing.
