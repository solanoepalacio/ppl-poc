## 1. Shared select-on-focus behavior

- [x] 1.1 Add a shared helper (`useSelectAllOnFocus` in `packages/frontend/src/lib/selectAllOnFocus.ts`) exporting an `onFocus` handler that calls `event.target.select()` and a mousedown-aware guard that `preventDefault()`s the focusing click's mouse-up to keep the selection from collapsing to the caret
- [x] 1.2 Ensure the helper is a safe no-op where `select()` is unsupported (`select?.()`) and does not re-select on value-change re-renders (selection bound to focus/mouse events, not value)

## 2. Apply to numeric quantity fields

- [x] 2.1 Wire the helper into the `<input type="number">` in `ItemQuantityFields.tsx` (covers the back-office create-order modal and edit-items form) without changing its `min`/floor/clamp logic
- [x] 2.2 Wire the helper into the `<input type="number">` in `QuantityStepper.tsx` (customer-facing) without changing its `min`/clamp logic or the +/- buttons

## 3. Verify

> Automated frontend tests are out of scope: the frontend package is intentionally test-free
> (no Jest/RTL/jsdom; `test` is a stub). Verification is manual, per project convention. The
> code change is covered by `tsc --noEmit` (`yarn lint`).

- [x] 3.1 ~~Jest unit test for the shared helper~~ — cut: no frontend test harness (test-free by design)
- [x] 3.2 ~~Component tests for replace-on-type~~ — cut: no frontend test harness (test-free by design)
- [x] 3.3 Manually verify in-app: clicking beside a `0` and typing does not produce `010`; clicking anywhere selects the whole value; a second click while focused still places a caret
