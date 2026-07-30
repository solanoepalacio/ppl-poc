## 1. Client date-picker component

- [x] 1.1 Create a `"use client"` date-picker component (e.g. `packages/frontend/src/app/(backoffice)/orders/DayPicker.tsx`) that renders the `<label>` + `<input type="date">`, accepts the current `day` as a prop for its value
- [x] 1.2 On the input's `onChange`, push the new URL with the updated `?day=YYYY-MM-DD` param via `next/navigation` `useRouter().push()`; when the value is cleared/empty, navigate to `/orders` (no `day` param) so the server defaults to today
- [x] 1.3 Do not render any submit/"Ver" button in the component

## 2. Wire into the orders page

- [x] 2.1 In `packages/frontend/src/app/(backoffice)/orders/page.tsx`, replace the existing `<form method="get">` + `<input>` + "Ver" button block with the new `DayPicker` component, passing `view.day`
- [x] 2.2 Confirm the server component still reads `searchParams.day` and fetches via `getOrdersByDay(day)` unchanged

## 3. Verify

- [ ] 3.1 Manually verify: selecting a date immediately renders that day's orders with no extra click; the "Ver" button is gone; default-to-today and a shareable `?day=` URL still work
- [x] 3.2 Run frontend lint/build to confirm the new client/server boundary compiles
