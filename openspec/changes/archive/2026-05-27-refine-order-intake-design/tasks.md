## 1. Brand foundation & assets

- [x] 1.1 Prepare a trimmed Pannico wordmark asset (crop `resources/pannico-banner.png`, or use an SVG if available) and add it to `packages/frontend/public/`
- [x] 1.2 Add the design tokens (`--brand-slate`, `--brand-amber`, `--paper`, `--ink`, `--line`, radii, `--tap`, `--shadow-card`, `--maxw`, etc.) to `:root` in `globals.css`
- [x] 1.3 Load brand fonts via `next/font` — a condensed display face (Oswald/Archivo Narrow) for headings/wordmark and a legible sans for body — and wire them in `layout.tsx`
- [x] 1.4 Update base styles in `globals.css` (body background `--paper`, `--ink` text, the `main` reading column at `--maxw`) and set `<html lang="es">` in `layout.tsx`

## 2. Branded shell & header

- [x] 2.1 Add a reusable slate header bar with the wordmark, applied to the customer page across all states
- [x] 2.2 Restyle the `.card` / surface, base `button`, and `.error` classes to the new token system (slate/amber/paper)

## 3. Quantity stepper component

- [x] 3.1 Create a `QuantityStepper` client component (− button | value | + button), min 0, `inputMode="numeric"`, with `aria-label`s naming the product and action, and ≥44px tap targets
- [x] 3.2 Add visible keyboard focus styles to the stepper controls
- [x] 3.3 Replace the raw number input in `OrderForm.tsx` with `QuantityStepper`

## 4. Order entry screen (OrderForm)

- [x] 4.1 Localize all entry-screen copy to Spanish (title "Tu pedido", subtitle, hint, action labels, busy label)
- [x] 4.2 Style the catalog as branded product rows; visually distinguish rows with quantity > 0 (amber accent)
- [x] 4.3 Add a sticky bottom action bar within the reading column: running selection count, primary "Confirmar pedido" (amber), and secondary "Seguir por WhatsApp"
- [x] 4.4 Wire disabled states — primary disabled when no items and while busy; both actions disabled during submission — and keep the "add at least one product" hint
- [x] 4.5 Add bottom padding/`env(safe-area-inset-bottom)` so the sticky bar never overlaps the last row on small/iOS viewports

## 5. Outcome & error states

- [x] 5.1 Restyle and localize the "order received" success state (branded, prominent, Spanish)
- [x] 5.2 Restyle and localize the "continue on WhatsApp" state (branded, Spanish)
- [x] 5.3 Restyle and localize the invalid/expired-link state in `order/[token]/page.tsx` (branded, Spanish), sharing the header shell

## 6. Verification

- [x] 6.1 Manually verify all four states on a narrow mobile viewport (~360px) and a wide desktop viewport: no horizontal scroll, constrained column, primary action reachable
- [x] 6.2 Verify accessibility: every control has an accessible name, focus is visible on keyboard nav, and key text/UI meets WCAG AA contrast (especially white-on-amber button and any amber text)
- [x] 6.3 Confirm no behavioral regression: valid token → confirm → issued, WhatsApp fallback, empty/disabled rules, and invalid-token page all still work as before
