## Why

The "Agregar pedido" dialog bundled two unrelated jobs behind one modal: recording
an order the manager takes directly, and issuing a shareable customer link. They
share only the client selector — the link path ignores the product list and the
message entirely. Keeping **Generar link** as a third footer button inside the
order-creation modal made that dense dialog do double duty and buried a common
action. Pulling link generation out into its own toolbar trigger makes each dialog
single-purpose.

## What Changes

- **Generar link is its own toolbar trigger.** A new **Generar link** button sits
  in the bloque toolbar next to **Agregar pedido**. It opens a dedicated modal:
  pick a client, generate the link, copy it — nothing else.
- **The order-creation modal is single-path.** "Agregar pedido" drops its
  **Generar link** footer button and the two-step form→link flow. Its footer is
  now just **Cancelar** and **Agregar pedido**; it only records order contents.
- Both triggers stay gated on the open bloque (grayed out and unclickable on any
  other bloque), like the existing bloque actions.

## Capabilities

### Modified Capabilities

- `order-create-presentation`: link generation moves out of the order-creation
  modal into its own toolbar trigger and modal; the creation modal is now
  single-path (Agregar pedido only), no longer offering a Generar link action.

## Impact

- **Frontend only.** New `GenerateLinkModal` (toolbar button + client-picker modal
  reusing the existing link-generation and copy behavior); `CreateOrderModal`
  loses its `link` step, the `createLink`/copy state, and the Generar link footer
  button; `orders/page.tsx` renders the new trigger next to Agregar pedido.
- **Backend / contract**: none. Link generation still posts the same
  `createLink(clientId)`; direct creation still posts `{ clientId, items, message }`.
