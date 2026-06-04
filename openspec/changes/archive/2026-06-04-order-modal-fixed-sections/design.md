## Context

The order-creation modal (`CreateOrderModal.tsx`) renders inside a shared `Modal` shell (`Modal.tsx`) built on the native `<dialog>` element. The shell is a flex column with three parts: a pinned `.modal-header`, a scrolling `.modal-body` (`overflow-y: auto`), and a pinned `.modal-footer`. All step content — phone, the optional choose/link UI, the catalog items list, and the message textarea — is rendered as children of the single `.modal-body`, so in the content step the body scrolls phone, items, and message together.

The catalog list (`ItemQuantityFields`) renders one row per product and is long (dozens of items). The desired behaviour for the content step is three regions inside the modal body: phone fixed at top, items as the only scrolling region, message fixed at bottom — with header and footer staying pinned as today.

## Goals / Non-Goals

**Goals:**
- In the content step, pin phone at the top and message at the bottom of the modal body; make the items list the only scrollable region.
- Keep the modal height bounded (as today, `calc(100vh - 4rem)`) so the scroll region is stable.
- Preserve the existing choose/link steps, validation, submission, and analytics unchanged.

**Non-Goals:**
- No change to choose/link step layouts (they have little content and need no internal scroll region).
- No change to order data, API calls, or the products/quantities model.
- No new shared Modal API or design-system work beyond what this layout needs.

## Decisions

**Decision: Make `.modal-body` a flex column and let the items list flex-grow as the scroll region, rather than giving each step its own scroll container.**
The modal body already sits between a pinned header and footer inside a height-bounded flex column. Turning `.modal-body` into `display: flex; flex-direction: column` with `overflow: hidden`, then giving the items region `flex: 1 1 auto; overflow-y: auto; min-height: 0` and the phone/message regions `flex: 0 0 auto`, yields exactly three regions with one scroller. The `min-height: 0` is required so the flex item can shrink below its content height and actually scroll.
- *Alternative considered:* absolutely-positioned regions with a fixed-height items list — rejected as brittle across viewport sizes and harder to keep within the existing `max-height` bound.

**Decision: Scope the three-region layout to the content step via a modifier class, leaving choose/link rendering as-is.**
Add a content-step wrapper (e.g. `.order-content`) inside the modal body that owns the flex column, with `.order-content__items` as the scroller. Choose and link steps continue to render directly in the body as plain blocks. This avoids forcing a flex/scroll layout on steps that don't need it.
- *Alternative considered:* always applying the flex column to `.modal-body` — rejected because the choose/link steps would inherit scroll/flex semantics they don't need and the phone block's spacing differs between steps.

**Decision: Keep phone and message as the fixed regions; do not duplicate the phone field across steps.**
The same `PhoneField` instance renders for all steps; in the content step it simply sits in the fixed top region. The invalid-phone hint and the error line stay attached where they are today.

## Risks / Trade-offs

- [Items region collapses or fails to scroll if `min-height: 0` is omitted on the flex scroller] → Explicitly set `min-height: 0` on the items region; verify scrolling at small viewport heights.
- [On very short viewports the fixed phone + message leave little room for items] → The items region flexes to remaining space and scrolls; message uses a modest fixed height (existing `rows={6}` textarea, optionally capped) so it never crowds out items entirely. Acceptable for the back-office use case.
- [Regression in choose/link steps if the flex layout is applied too broadly] → Scope the flex column to the content-step wrapper only; leave other steps untouched.

## Migration Plan

Pure frontend presentation change; no data or API migration. Ship the CSS + JSX grouping together. Rollback is reverting the two touched files (`CreateOrderModal.tsx`, `globals.css`).

## Open Questions

- Should the message textarea height be capped (e.g. `max-height`) on short viewports so the items region always retains usable space? Default: keep current `rows={6}` and revisit only if testing shows crowding.
