## 1. Production day picker

- [x] 1.1 Add a client `DayPicker` component for the production view (e.g. `packages/frontend/src/app/(backoffice)/production/DayPicker.tsx`), mirroring the orders `DayPicker`: native date input with `value={day}`, navigating via `router.push` inside `useTransition` on `onChange`, disabled while pending. Navigate to `/production?day=YYYY-MM-DD`, and to `/production` when the input is cleared.

## 2. Wire into the production view

- [x] 2.1 In `packages/frontend/src/app/(backoffice)/production/page.tsx`, replace the GET `<form>` + date input + "Ver" button with `<DayPicker day={production.day} />`.
- [x] 2.2 Update the production page header comment so it no longer describes a GET-form submit, matching the immediate-navigation behavior.

## 3. Verify

- [x] 3.1 Confirm selecting a date loads that day's totals with no extra click and that no "Ver"/submit button remains; confirm the day still appears in the URL as `?day=YYYY-MM-DD` and clearing it defaults to today.
