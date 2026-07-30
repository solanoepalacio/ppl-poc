## Context

The audit found the back-office UI is ~60% English, ~40% Spanish, while the customer order page (`app/order/[token]/`) is 100% Spanish. The existing Spanish copy uses **informal Argentine voseo** ("Elegí lo que querés", "Pedile a la panadería", "Seguí por WhatsApp") in **sentence case**. The nav already uses Spanish nouns ("Órdenes", "Producción", "Crear orden"). This change makes the back-office match.

This is a string-only change: no new components, no logic, no API or data changes.

## Goals / Non-Goals

**Goals**
- Every visible back-office string is Spanish.
- Every back-office aria-label, confirmation dialog, and error/success message is Spanish.
- One consistent voice across customer + back-office.

**Non-Goals**
- No i18n framework, locale switching, or string-extraction system — strings stay inline as today.
- No changes to the customer order page (already Spanish).
- No translation of stored enum values (order statuses) or developer-only strings (code comments, console logs).
- No visual/layout redesign.

## Decisions

### Voice and casing
Use **informal voseo, sentence case**, matching the customer page. Back-office is used by bakery staff, so the informal tone is appropriate and keeps one product voice.
- Imperative instructions use voseo: "Generá un enlace…", "Ingresá la orden…", "Pegá el mensaje…".
- Buttons stay short and conventional: "Ver", "Generar", "Crear orden", "Editar artículos", "Eliminar", "Guardar artículos", "Cancelar", "Copiar enlace", "Cerrar".

### Terminology (fixed glossary, applied consistently)
| English | Spanish |
|---|---|
| order | orden |
| item(s) (line items) | artículo(s) |
| product | producto |
| link | enlace |
| phone | teléfono |
| area code | código de área |
| local number | número local |
| message | mensaje |
| day | día |
| production | producción |
| customer | cliente |

### Status labels
Order status enum **values** (`pending`, `issued`, `finished`, `ignored`) are not translated at the data layer. Where a status is shown to the user via `OrderStatusControl`, present a Spanish **display label** mapped from the enum value (e.g. pendiente / emitida / finalizada / ignorada) without changing the stored value or API contract. The "failed" transient UI text becomes "falló".

### Inline strings, not a framework
Keep each string literal where it lives. Introducing an i18n library is out of scope for this PoC and would be churn without payoff while there is only one language.

## Risks / Trade-offs

- **Drift risk**: inline strings can regress to English in future work. Mitigation — the new `back-office-localization` spec makes "all back-office text is Spanish" a checkable requirement.
- **Status mapping**: introducing a status→label map is the one place with a tiny bit of logic; keep it a simple lookup colocated with the status control so it stays trivial and testable.

## Migration Plan

Direct edit; no migration. Ship in one pass, file by file, then read every back-office screen to confirm no English remains.

## Open Questions

- Status display labels' exact wording (pendiente/emitida/finalizada/ignorada) — using these unless the user prefers other terms.
