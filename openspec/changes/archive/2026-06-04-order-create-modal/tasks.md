## 1. Relocate shared PhoneField

- [x] 1.1 Move `app/(backoffice)/links/PhoneField.tsx` to a location that survives the `/links` removal (e.g. `app/(backoffice)/orders/PhoneField.tsx`)
- [x] 1.2 Update all imports of `PhoneField` to the new path

## 2. Build the order-creation modal

- [x] 2.1 Add a client component (e.g. `orders/CreateOrderModal.tsx`) that owns `open` state and accepts `products: Product[]`
- [x] 2.2 Implement a `step` state machine: `'choose'` (phone + two buttons) → `'link'` or `'content'`
- [x] 2.3 Render the phone-first step: `PhoneField` + two `type="button"` buttons labelled **Generar link** and **Cargar contenido**, both disabled until `isValidPhoneEntry(areaCode, localNumber)`
- [x] 2.4 Implement the **Generar link** path: call `createLink(composePhoneE164(...))`, switch to the `'link'` step, and show the URL + copy button (port `LinkGenerator` result/copy/error handling)
- [x] 2.5 Implement the **Cargar contenido** path: switch to the `'content'` step revealing `ItemQuantityFields` + the optional message textarea + a Crear orden submit
- [x] 2.6 Wire content submit to `createOrder({ phone, items: itemsFromQuantities(quantities), message })`; on success close the modal and `router.refresh()` (port `DirectOrderForm` logic, including the invalid-number inline hint)
- [x] 2.7 Remove all per-path explanatory paragraphs; keep only inline validation hints and the generated-link result
- [x] 2.8 Reset modal state (`step`, phone, quantities, message, result, error) on open and on close

## 3. Mount the trigger on the orders view

- [x] 3.1 Render the `CreateOrderModal` trigger button near `<DayPicker />` at the top of `orders/page.tsx`, passing the already-fetched `products`
- [x] 3.2 Verify the modal opens over the orders list and closing it leaves the list unchanged

## 4. Remove the standalone creation view

- [x] 4.1 Delete `app/(backoffice)/links/page.tsx`, `LinkGenerator.tsx`, and `DirectOrderForm.tsx` (after their logic is folded into the modal)
- [x] 4.2 Remove the `{ href: '/links', label: 'Crear orden' }` entry from `BackofficeNav.tsx`, leaving Órdenes and Producción

## 5. Verify

- [x] 5.1 Type-check / build the frontend with no broken imports from the moved `PhoneField` or deleted `/links` route
- [x] 5.2 Manually verify: trigger opens modal → Generar link shows a copyable URL; Cargar contenido reveals items + message and creates an order that appears in the day view
- [x] 5.3 Run `openspec validate "order-create-modal"`
