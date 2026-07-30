## Why

The order-intake form is the only Pannico surface a customer ever sees, and right now it looks like an internal tool: system fonts, a bare list of product names with raw number inputs, and generic green/grey buttons with no brand presence. For a "zero-friction, trust-the-customer" PoC, first impressions are the product — the page has to feel like it belongs to the bakery and be effortless on a phone, where it will almost always be opened from a WhatsApp link.

## What Changes

- Apply the Pannico brand identity (slate-blue / white / golden-amber palette and the logo's condensed-display feel, sourced from `resources/pannico-banner.png`) to the customer order page, including the logo/wordmark at the top.
- Localize all customer-facing copy to **Spanish** to match the brand voice ("PANADERÍA CREATIVA"); the back-office pages stay as-is for this change.
- Replace raw number inputs with tap-friendly **−/+ quantity steppers** designed for mobile, with a running summary of what's selected.
- Restyle the three states — order entry, "order received" confirmation, and "continue on WhatsApp" — and the invalid/expired-link page into a cohesive, branded mobile-first layout.
- Strengthen accessibility and touch usability: adequate tap targets, visible focus states, labeled controls, and sufficient color contrast.
- No behavioral changes: token validation, catalog source, the confirm/whatsapp endpoints, and order status transitions all stay exactly as specified by the `order-intake` capability.

## Capabilities

### New Capabilities
- `order-intake-presentation`: The visual and interaction design of the customer-facing order page — brand application (palette, logo, typography), Spanish localized copy, the mobile-first responsive layout, the −/+ quantity steppers and selection summary, and the styling of the confirmation, WhatsApp-fallback, and invalid-link states. Covers presentation and UX only; the order's behavior, validation, and status rules remain owned by `order-intake`.

### Modified Capabilities
<!-- None — order-intake's behavioral requirements are unchanged; this change only adds presentation requirements, captured as a new capability. -->

## Impact

- **Frontend (`packages/frontend`):** `src/app/order/[token]/OrderForm.tsx` (steppers, Spanish copy, branded states), `src/app/order/[token]/page.tsx` (invalid-link page, logo/header), and `src/app/globals.css` (brand tokens, layout, component styles). A logo/banner asset from `resources/` is added to the frontend's public assets.
- **No backend, API, or data changes.** The `order-intake` behavioral contract, the catalog seed, and the token/status logic are untouched.
- **Possible new dependencies:** a brand display webfont (e.g. self-hosted via `next/font`) if a close match to the wordmark is wanted; otherwise a well-paired system/Google font stack. No runtime framework changes.
