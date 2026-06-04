## Context

Order creation lives at `app/(backoffice)/orders/../links/page.tsx` (route `/links`), a server page that renders two stacked client forms:
- `LinkGenerator` — phone field + "Generar" button → `POST /links`, then shows the shareable URL.
- `DirectOrderForm` — phone field + items list + optional message → `POST /orders`, then `router.refresh()`.

Each form repeats `PhoneField` and is wrapped in explanatory copy. The orders view (`orders/page.tsx`) is a separate server page with a `DayPicker` at the top.

The frontend already has the pieces this change needs:
- `orders/Modal.tsx` — a native `<dialog>`-based modal (ESC/backdrop close, scrollable body, header + footer), already used by `OrderActions` for the edit-items modal.
- `links/PhoneField.tsx` — the two-field Argentine phone control.
- `orders/ItemQuantityFields.tsx` — the catalog quantity list + `itemsFromQuantities()` helper.
- `lib/api.ts` — `createLink(phone)` and `createOrder({ phone, items, message })`.

This is a presentation/placement change. No backend, data-model, or API changes.

## Goals / Non-Goals

**Goals:**
- Launch order creation as a modal from the orders view via a trigger near the `DayPicker`.
- Make the modal phone-first: phone entry, then two buttons — **Generar link** / **Cargar contenido**.
- Reveal the items list (and message field) only after **Cargar contenido**.
- Remove per-path explanatory copy; keep functional inline text (validation hints, generated-link result).
- Remove the `/links` route and the "Crear orden" nav entry; reuse `POST /links` and `POST /orders` unchanged.

**Non-Goals:**
- No change to link generation, order creation, validation, or status semantics on the backend.
- No redesign of `PhoneField`, `ItemQuantityFields`, or `Modal` internals.
- No change to the customer-facing order form or to the production view.

## Decisions

### Decision: Host the modal in a new client component owned by the orders view
The orders `page.tsx` is an async server component. Add a single client component (e.g. `CreateOrderButton`/`CreateOrderModal`) rendered next to `<DayPicker />`, receiving `products` (already fetched server-side on the orders page) as a prop. It owns `open` state, renders the trigger button, and renders `<Modal>`.

- **Why:** Keeps the server page server-rendered; isolates all interactivity in one client island. Mirrors how `OrderActions` already embeds a `Modal` on the orders page.
- **Alternative considered:** Make the whole orders page a client component — rejected; loses server rendering of the list and is a larger blast radius.

### Decision: Phone-first with a `step` state, two-path within one modal
The modal component holds the shared phone state (`areaCode`, `localNumber`) plus a `step` discriminator: `'choose'` (phone + two buttons) → `'link'` (link generated/shown) or `'content'` (items + message + submit). "Generar link" calls `createLink` and moves to the link result; "Cargar contenido" switches to the content step. A back/close affordance resets to `'choose'`.

- **Why:** A single shared phone entry feeds both paths (the user's explicit requirement to reuse the phone field). One component avoids duplicating phone state across two forms.
- **Alternative considered:** Keep `LinkGenerator` and `DirectOrderForm` as two independent forms inside the modal — rejected; that duplicates the phone field and reproduces the "two screens" feel the change is removing.

### Decision: Reuse `createLink` / `createOrder` logic; fold the old forms into the modal
Rather than keep `LinkGenerator.tsx` and `DirectOrderForm.tsx` as wrappers, lift their submit logic (generate link; create order then `router.refresh()` and close) into the modal's two steps. Drop the explanatory `<p className="muted">` paragraphs. Keep inline validation (`isValidPhoneEntry`) and the generated-link/copy result.

- **Why:** The forms' framing copy and standalone-form structure are exactly what's being removed; their core handlers are small and move cleanly into the steps.
- **Alternative considered:** Import the existing components verbatim — rejected; they carry the copy and their own phone state, defeating phone reuse.

### Decision: Move `PhoneField` out of `links/`
`PhoneField.tsx` currently lives under the `links/` route folder being deleted. Move it to a location that survives (e.g. `orders/PhoneField.tsx` or a shared `components/` folder) and update imports.

- **Why:** Deleting the `/links` route must not delete a component the modal still depends on.

### Decision: Nav drops to two links
`BackofficeNav.tsx` removes the `{ href: '/links', label: 'Crear orden' }` entry, leaving Órdenes and Producción. Delete `links/page.tsx`. The `back-office-navigation` spec's landing requirement (orders-by-day as root) is unaffected.

## Risks / Trade-offs

- **Bookmarked/linked `/links` URL 404s after removal** → Acceptable for a single-operator PoC; no external links to `/links` exist. If needed later, add a redirect to `/orders`.
- **State leakage between opens** (a stale generated link or quantities showing on reopen) → Reset modal state (`step`, phone, quantities, message, result, error) on open/close.
- **Losing direct-form behavior in the move** (reset-on-success, `router.refresh()`, message field, invalid-number hint) → Port these explicitly when folding `DirectOrderForm` logic into the content step; covered by tasks.
- **Two buttons both submitting a form** → The phone-first step is a chooser, not a submit; ensure the buttons are `type="button"` so neither implicitly submits a wrapping form.

## Migration Plan

1. Move `PhoneField` to a surviving location; update its imports.
2. Add the client modal component to the orders view next to `DayPicker`, folding in link-generation and direct-order logic across the `choose` / `link` / `content` steps, without explanatory copy.
3. Remove the `/links` route (`links/page.tsx`, `LinkGenerator.tsx`, `DirectOrderForm.tsx`) and the "Crear orden" nav entry.
4. No DB migration; no rollback steps beyond reverting the frontend commits.

## Open Questions

- Should "Generar link" stay within the same modal after generating (showing the copyable URL) or is a follow-up close expected? Assumed: stay in the modal showing the link + copy button, consistent with today's `LinkGenerator` result card.
- Button labels: the proposal uses **Generar link** and **Cargar contenido** verbatim; confirm casing/wording at implementation.
