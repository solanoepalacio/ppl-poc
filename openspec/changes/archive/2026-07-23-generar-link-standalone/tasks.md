## 1. Split link generation out of the creation modal

- [x] 1.1 New `GenerateLinkModal`: a `btn-toolbar-ghost` trigger opening a modal with the client picker; on generate, show the link with a copy control (reuse `createLink` + `order_link_generated`/`order_link_copied` tracking); gated on the open bloque via `disabled`
- [x] 1.2 `CreateOrderModal`: drop the `link` step, the `createLink`/`result`/`copied`/`busy` state and the Generar link footer button; footer is Cancelar + Agregar pedido; body/regions no longer branch on step
- [x] 1.3 `orders/page.tsx`: render `GenerateLinkModal` next to `CreateOrderModal`, passing `clients` and `disabled={!isOpen}`

## 2. Verification

- [x] 2.1 Typecheck the frontend
- [x] 2.2 Drive the orders view: toolbar shows Agregar pedido + Generar link next to each other; Generar link modal picks a client → generates → copy/Listo; Agregar pedido footer no longer has Generar link
- [x] 2.3 `openspec validate generar-link-standalone --strict`
