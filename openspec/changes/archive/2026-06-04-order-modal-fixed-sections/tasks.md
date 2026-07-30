## 1. Restructure the content step into three regions

- [x] 1.1 In `CreateOrderModal.tsx`, lay out the content step as three regions: the existing `PhoneField` (already the body's first child) as the fixed top region, a scrollable `order-content__items` div wrapping `ItemQuantityFields`, and the message `field` as the fixed bottom region. (Deviation: rather than a single `.order-content` wrapper div, the modal body itself becomes the flex column via an opt-in `bodyClassName="modal-body--content"` on the shared `Modal`, so the body's existing height bound/padding is reused and the shared edit-items modal is unaffected.)
- [x] 1.2 Keep the `PhoneField` (and its invalid-phone hint) as the body's first child for all steps — single instance, no remount; in the content step it sits in the fixed top region.
- [x] 1.3 Keep the `error` line and footer (Crear orden / Volver) rendering unchanged.

## 2. Apply the fixed/scrollable CSS layout

- [x] 2.1 In `globals.css`, add `.modal-body--content` as a flex column with `overflow: hidden` and `min-height: 0` (opt-in body class; shared `.modal-body` and its bound `calc(100vh - 4rem)` via `.modal-card` are unchanged). Added a `bodyClassName` prop to `Modal.tsx` to apply it.
- [x] 2.2 Give the items region (`.order-content__items`) `flex: 1 1 auto; overflow-y: auto; min-height: 0` so it is the only scroller and can shrink to scroll.
- [x] 2.3 Give the message region (`.order-content__message`) `flex: 0 0 auto` so it stays fixed; phone is fixed as a content-sized flex child. Message field keeps its existing `.field` styling.

## 3. Verify behaviour

- [x] 3.1 Ran the app and opened the create-order modal; chose Cargar contenido and confirmed phone pinned top, message pinned bottom, only the items list scrolls. (User-verified — looks good.)
- [x] 3.2 Verified the items region scrolls while phone/message stay visible. (User-verified.)
- [x] 3.3 Confirmed the choose and link steps are visually unchanged and order submission still works. (User-verified.)
