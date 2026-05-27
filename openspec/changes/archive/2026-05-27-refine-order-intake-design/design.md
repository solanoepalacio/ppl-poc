## Context

The customer order page (`/order/[token]`) is the only Pannico surface a customer sees, almost always opened on a phone from a WhatsApp link. Today it renders with system fonts, a bare product list with raw `<input type="number">` fields, and generic green/grey buttons defined in a flat `globals.css` — no brand presence and weak touch ergonomics.

The brand is defined by `resources/pannico-banner.png`: a tall, condensed display wordmark "pan**nico**" (white + amber) over the tagline "PANADERÍA CREATIVA", on a slate-blue field. Sampled palette:

- Slate blue `#365566` (primary brand surface)
- White `#FFFFFF`
- Golden amber `#D39B23` (accent)

Constraints: behavior is frozen by the `order-intake` capability (token validation, catalog source, confirm/whatsapp endpoints, status transitions). This change is presentation + interaction only, frontend-only, and must stay frictionless (no login, no prices, no payment). Copy moves to Spanish.

## Goals / Non-Goals

**Goals:**
- A cohesive, branded, mobile-first design that feels like Pannico across all four states: order entry, "order received", "continue on WhatsApp", and invalid/expired link.
- Effortless one-thumb operation: −/+ steppers, large tap targets, a clear running selection summary, and an obvious primary action.
- A small, reusable design-token system (CSS custom properties) so the palette/typography are defined once.
- Spanish copy throughout the customer page; accessible (labels, focus states, AA contrast).

**Non-Goals:**
- No changes to backend, API, data model, catalog seed, or order status logic.
- No restyle of the back-office pages (`/links`, `/orders`) in this change.
- No new framework, component library, or CSS-in-JS migration — plain CSS + tokens stays.
- No dark mode, theming, or i18n framework (Spanish is hardcoded for the PoC).

## Decisions

### D1. Plain CSS with custom-property design tokens (not Tailwind / CSS-in-JS)
Define brand tokens once at `:root` in `globals.css` and build component classes on them. The app already uses a single global stylesheet; adding a build-time CSS framework is disproportionate for one page.

```css
:root {
  --brand-slate: #365566;
  --brand-slate-700: #2b4655;   /* darker for active/press */
  --brand-amber: #D39B23;
  --brand-amber-600: #b8851a;   /* hover/press */
  --paper: #fbf8f3;             /* warm off-white page bg */
  --surface: #ffffff;           /* cards */
  --ink: #1f2a30;               /* primary text */
  --ink-muted: #5d6b72;
  --line: #e7e1d6;
  --radius: 14px;
  --radius-pill: 999px;
  --tap: 44px;                  /* min touch target */
  --shadow-card: 0 2px 12px rgba(54,85,102,0.08);
  --maxw: 560px;
}
```
*Alternative considered:* Tailwind — rejected as overkill for a single page and a larger diff. CSS-in-JS — rejected, no existing runtime styling and it adds bundle weight.

### D2. Typography: condensed display font for headings, clean sans for body
The wordmark is a tall condensed display face. Load a close, free match via `next/font/google` (e.g. **Oswald** or **Archivo Narrow**) for the page title/wordmark and section headers; keep a neutral sans (system stack or **Inter**) for body and controls for legibility at small sizes. `next/font` self-hosts and avoids layout shift.
*Alternative considered:* using the exact brand font file — not available in-repo and licensing is unknown; a close Google match is the pragmatic PoC choice. *Alternative:* all-system fonts — keeps things simplest but loses the brand's distinctive display feel that makes it "slick."

### D3. Branded header with the wordmark on every state
A slim slate header bar carries the Pannico wordmark/logo so brand is present on entry, both outcomes, and the invalid-link page. The banner asset is added to `packages/frontend/public/` (a trimmed wordmark, ideally SVG/PNG) and rendered via `next/image`. This unifies the four states, which today look inconsistent.

### D4. −/+ stepper as a small client component
Replace the raw number input with a `QuantityStepper` (− button | value | + button), min 0, large tap targets, `aria-label`, and an editable value for power users (still `inputMode="numeric"`). The amber accent marks the active/selected row. Items with qty > 0 get a subtle selected treatment so the customer sees their choices at a glance.
*Alternative considered:* keep typed number inputs — rejected for poor mobile ergonomics; steppers are the headline UX improvement.

### D5. Sticky action bar + running summary
On the entry screen, pin a bottom action bar (within the `--maxw` column) showing the running item count and the primary "Confirmar pedido" button, with the WhatsApp fallback as a quieter secondary control. This keeps the call-to-action reachable without scrolling on long catalogs. The empty-state hint ("Agrega al menos un producto") lives near the disabled button.
*Alternative considered:* inline buttons after the list (current) — fine for short catalogs but forces scrolling; sticky bar is more reliable on mobile.

### D6. Spanish copy, centralized
All visible strings move to Spanish, defined as local constants in the components (no i18n framework). Reference copy:
- Title: "Tu pedido" · subtitle: "Elegí lo que querés y la cantidad."
- Primary: "Confirmar pedido" / busy: "Enviando…" · Secondary: "Seguir por WhatsApp"
- Confirmed: "¡Pedido recibido! ✅" / "Gracias. Tu pedido fue enviado a la panadería."
- WhatsApp: "Seguí por WhatsApp 💬" / "Sin problema — continuá tu pedido por WhatsApp con la panadería."
- Invalid: "Este enlace ya no es válido" / "El enlace expiró o ya fue usado. Pedile a la panadería un nuevo enlace."

### Target layouts (mobile-first)

```
ENTRY                          CONFIRMED / WHATSAPP / INVALID
┌─────────────────────────┐    ┌─────────────────────────┐
│ ▎pan nico   (slate bar) │    │ ▎pan nico   (slate bar) │
├─────────────────────────┤    ├─────────────────────────┤
│ Tu pedido               │    │                         │
│ Elegí lo que querés…    │    │        ✅                │
│ ┌─────────────────────┐ │    │   ¡Pedido recibido!     │
│ │ Pan de campo   −2+ ◂│ │    │  Gracias. Tu pedido…    │
│ │ Medialunas     −0+  │ │    │                         │
│ │ Focaccia       −1+ ◂│ │    └─────────────────────────┘
│ └─────────────────────┘ │    (◂ = amber selected row)
│                         │
│┌───────────────────────┐│  sticky bottom action bar
││ 3 productos           ││
││ [ Confirmar pedido  ] ││  primary = amber
││  Seguir por WhatsApp  ││  secondary = quiet text/outline
│└───────────────────────┘│
└─────────────────────────┘
```

## Risks / Trade-offs

- **[Close-but-not-exact brand font]** → Use a condensed Google font (Oswald/Archivo Narrow) tuned with letter-spacing to evoke the wordmark; the literal logo is shown as an image asset, so the headline brand mark is exact even if body display type only approximates it.
- **[Sticky bottom bar overlapping content / iOS safe-area]** → Add bottom padding equal to the bar height plus `env(safe-area-inset-bottom)`; test on small viewports.
- **[Amber-on-white contrast for text]** → Use amber for fills/accents and borders, not for small body text; verify primary button (white text on amber) and any amber text meets WCAG AA, darkening to `--brand-amber-600` where needed.
- **[Scope creep into back office]** → Tokens land in shared `globals.css`, but only the customer page's markup/classes change this round; back-office pages are explicitly untouched.
- **[Asset prep]** → Need a clean, trimmed wordmark (ideally SVG) in `public/`; if only the full banner PNG exists, crop it. Mitigation noted as a task.

## Open Questions

- Wordmark asset: crop the existing PNG, or is an SVG/transparent logo available? (Affects header sharpness.)
- Spanish dialect/register — the draft copy uses Rioplatense voseo ("elegí", "querés"); confirm that matches the bakery's audience vs. neutral Spanish ("elige", "quieres").
- Exact display font choice (Oswald vs. Archivo Narrow) — to be picked during implementation against the live header.
