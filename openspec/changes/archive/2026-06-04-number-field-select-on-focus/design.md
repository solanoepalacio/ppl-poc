## Context

Numeric quantities are entered through two presentational components: `ItemQuantityFields` (back-office create-order modal and edit-items form) and `QuantityStepper` (customer-facing order page). Both render a controlled native `<input type="number">` whose displayed value is the current quantity held in parent state. Native focus places the caret rather than selecting the value, so editing an existing quantity appends or prepends digits instead of replacing them. There is no shared input primitive today; each component owns its own `<input>` markup and `onChange` handler.

## Goals / Non-Goals

**Goals:**
- Focusing any numeric quantity field selects its entire value, so the next keystroke replaces it.
- The selection happens for every focus path: mouse click (anywhere in the field), keyboard tab-in, and programmatic focus.
- Behavior is consistent across the back-office and customer surfaces.

**Non-Goals:**
- No change to value parsing, clamping (`min` 0, integer floor), or the drop-zeros-on-submit logic.
- No introduction of a general-purpose design-system input component; the scope is the existing quantity fields.
- No change to the stepper +/- buttons or to non-numeric fields (phone, date, message).

## Decisions

**Decision: Select-all on focus via an `onFocus` handler that calls `event.target.select()`.**
Selecting the full value on focus is the smallest change that yields replace-on-type, because once the text is selected the browser's default input handling replaces the selection with the typed character. This needs no custom keystroke interception and preserves the existing controlled-input model. Alternative considered: intercepting `onKeyDown`/`onBeforeInput` to clear the value on first keypress — rejected as more code, more edge cases (paste, arrow keys, deletion), and worse than the native selection semantics.

**Decision: Guard the click case so the selection is not collapsed by the click's mouse-up.**
A mouse click focuses the input (firing `onFocus`, where we select), but the subsequent `mouseup` collapses the selection to the caret position — defeating "selected no matter where I click." To keep the selection, the field tracks whether the current focus was just acquired and, on the first `mouseUp` after focusing, calls `event.preventDefault()` so the caret placement does not override the select-all. Subsequent clicks while already focused behave normally (the user can place a caret deliberately). Alternative considered: calling `select()` inside `onMouseUp` instead of `onFocus` — rejected because it misses the keyboard tab-in path.

**Decision: Encapsulate the behavior in one shared helper rather than duplicating it in both components.**
A tiny module (e.g. `selectAllOnFocus`) exporting the focus/mouse-up handlers (or a small hook) is imported by both `ItemQuantityFields` and `QuantityStepper`, so the two surfaces stay in lockstep and the behavior is unit-testable in one place. Alternative considered: inline duplicate handlers in each component — rejected to avoid drift between the two numeric fields.

## Risks / Trade-offs

- [Power users sometimes want to place a caret to edit one digit] → Mitigated: only the *first* mouse-up after focus is suppressed; clicking again while focused places a caret normally, so deliberate caret placement is still possible.
- [`select()` on `type="number"` is not supported in every legacy browser] → Mitigated: the field already targets modern evergreen browsers; the handler is a no-op fallback where unsupported, leaving today's behavior intact rather than breaking.
- [Programmatic re-render could re-trigger selection unexpectedly] → Mitigated: selection is bound to focus and mouse-up events, not to value changes, so normal typing does not re-select.

## Migration Plan

Pure additive presentation change shipped with the frontend; no data migration. Rollback is reverting the component edits. No feature flag needed.

## Open Questions

None.
