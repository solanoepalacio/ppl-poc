## Why

On the back-office production view, changing the day requires two actions: pick a date, then click **"Ver"** to submit the form and load that day's totals. The orders-by-day view already navigates immediately on date change with no button, so the production view is inconsistent and adds needless friction. Aligning the two removes a click and a stale-looking control.

## What Changes

- Selecting a date in the production view's day picker SHALL render that day's production totals automatically, without any further action.
- **BREAKING** (UI): Remove the **"Ver"** submit button from the production view.
- Replace the GET-form date picker on the production view with the immediate-navigation client `DayPicker` pattern already used by the orders-by-day view, so the selected day still lives in the URL (`?day=YYYY-MM-DD`).

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `production-totals`: The "Back office surfaces the day's production totals" requirement changes so that selecting a day applies immediately (no explicit submit/"Ver" action) to reflect the chosen day.

## Impact

- `packages/frontend/src/app/(backoffice)/production/page.tsx`: replace the GET `<form>` + date input + "Ver" button with the client day picker.
- A day-picker component for the production view (reusing the orders `DayPicker` pattern, navigating to `/production?day=...`).
- No backend, API, or data changes — `getProductionTotals(day)` and the `/orders/production` endpoint are unchanged.
