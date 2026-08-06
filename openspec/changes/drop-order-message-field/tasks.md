## 1. Remove the field

- [x] 1.1 `CreateOrderModal.tsx`: drop the `belowBody` block, the `message`
  state and its reset, and stop sending `message` in the `createOrder` payload.
  Leaving it in as a permanent `''` would send a field the modal no longer has —
  the backend maps blank to null, but the request should say what it means.
- [x] 1.2 Fix the component's doc comment, which describes the message as pinned
  below the body.

## 2. Remove what it leaves behind

- [x] 2.1 `Modal.tsx`: drop the `belowBody` prop and the `.modal-below` element.
  This modal was its only caller, so the region is now unreachable; `aboveBody`
  stays, since three dialogs use it.
- [x] 2.2 `globals.css`: drop `.modal-below` and the three `.modal-message` rules.
- [x] 2.3 Confirm nothing else references either class or the prop.

## 3. Leave the contract alone

- [x] 3.1 `@pannico/shared`'s `CreateOrderRequest.message`, the backend
  `CreateOrderDto`, `OrdersService.create`'s trim-to-null, and the `Order.message`
  column all stay. The API keeps accepting a message; only the manual path for
  supplying one goes. Its consumer is the future WhatsApp agent, which has the
  customer's own text.
- [x] 3.2 Backend tests covering message persistence stay untouched and passing —
  they cover the API, which has not changed.

## 4. Verify

- [x] 4.1 Frontend `lint`; backend `lint` + `test` (should be untouched).
- [x] 4.2 Drive the modal: no message field, the two regions are present, the
  search stays pinned at the foot of the list, and the list is still the only
  scrolling region with a long order.
- [x] 4.3 Create a real order through the modal and confirm it lands with its
  items and no message; delete it and leave the bloque as found.
- [x] 4.4 Confirm the other dialogs that share `Modal` (Stock, Producción Real,
  Editar, Generar link) still render correctly with `belowBody` gone.
