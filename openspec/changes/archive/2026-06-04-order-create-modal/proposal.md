## Why

Order creation currently lives on its own back-office view (`/links`) with two stacked, separately-explained forms (one for generating a link, one for direct entry), each repeating the phone field and surrounded by explanatory copy. The manager has to leave the orders view to take an order, and the two paths feel like two screens rather than one decision. Folding creation into a modal launched from the orders view — phone first, then a path choice — makes taking an order a quick, in-context action.

## What Changes

- Replace the standalone "Crear orden" view (`/links`) with a **modal launched from the orders view**, triggered by a button placed near the date picker at the top of the page.
- The modal is **phone-first**: it shows the existing two-field phone entry, then two buttons below it — **"Generar link"** and **"Cargar contenido"**.
  - **"Generar link"** generates and displays a shareable tokenized link for the entered phone (today's `LinkGenerator` behavior).
  - **"Cargar contenido"** reveals the catalog items list (with quantity steppers) and the optional message field, letting the manager record the order directly (today's `DirectOrderForm` behavior).
- Remove the per-section explanatory copy ("Ingresá la orden directamente cuando la tomás vos.", "Generá un enlace para compartir…", "Registrá una orden recibida por teléfono…"). The two buttons make the paths self-evident.
- Update the back-office navigation: the **"Crear orden"** nav entry and the `/links` route are removed; the nav now carries **Órdenes** and **Producción** only. **BREAKING** for anyone bookmarking `/links`.

## Capabilities

### New Capabilities
- `order-create-presentation`: How the back office presents order creation as a modal launched from the orders view — phone-first entry with a two-path choice (generate link vs. load content), the progressive reveal of the items list on "Cargar contenido", and the removal of explanatory copy.

### Modified Capabilities
- `back-office-navigation`: The persistent navigation drops the "Crear orden" view; order creation is no longer a standalone destination but an action launched from the orders view. The nav now has two links (Órdenes, Producción).

## Impact

- **Frontend** (`packages/frontend`):
  - Remove route `app/(backoffice)/links/page.tsx` (and the `/links` destination).
  - Add a "Crear orden" trigger + modal to `app/(backoffice)/orders/page.tsx`, reusing the existing `Modal`, `PhoneField`, and `ItemQuantityFields` components.
  - Rework `LinkGenerator` and `DirectOrderForm` into the modal's two paths (or extract their logic), removing explanatory copy.
  - Update `BackofficeNav.tsx` to drop the "Crear orden" link.
  - Relocate `PhoneField.tsx` (currently under `links/`) so it survives the route removal.
- **Backend**: No changes — `POST /links` and `POST /orders` are reused as-is.
- **No data model or API changes.** This is a presentation/placement change.
