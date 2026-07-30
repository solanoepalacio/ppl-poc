## Context

Order creation today is split across two back-office surfaces:

- **`/links` ("Crear link")** — `LinksPage` posts a phone to `POST /links`, which mints a single-use token + `pending` order and returns a shareable URL.
- **`/orders` ("Órdenes")** — renders a `CreateOrderForm` modal ("+ New order") that posts phone + items to `POST /orders`, creating an order directly (default status `issued`).

These are two distinct backend flows (`links.controller` vs `orders.controller`) that both produce an order. The split is purely a front-end placement choice; this change reorganizes the front end so both live on one "Crear orden" view, and adds an optional `message` field to the direct-entry flow so we can persist the originating WhatsApp text for later agent training.

Constraints: Next.js App Router with a `(backoffice)` route group + `BackofficeNav`; NestJS backend with `class-validator` DTOs; SQLite via Prisma (no native enums, string columns validated in the service layer); shared types in `@pannico/shared`.

## Goals / Non-Goals

**Goals:**
- A single back-office view, **"Crear orden"**, that offers both creation paths: generate a customer link, or record an order directly by adding items.
- Remove the "+ New order" entry point from the orders view (orders view keeps per-order edit/status/delete).
- Add an **optional** `message` free-text field to direct order entry; persist it on the order.
- Keep both existing backend flows (`POST /links`, `POST /orders`) intact — this is a placement + one-field change, not a backend redesign.

**Non-Goals:**
- No change to the customer-facing order form, token lifecycle, or link-generation behavior.
- No `message` on link-generated orders or customer-submitted confirmations (the field is for manually transcribed orders only).
- No UI to view/search/export captured messages (the orders view does not need to render `message` for this change; capture-only is sufficient).
- No new backend endpoint or merging of the two flows into one.

## Decisions

### Decision 1: Reuse the existing `/links` route, relabel to "Crear orden"
Rather than create a new route, repurpose `app/(backoffice)/links/page.tsx` as the combined view and rename the nav entry to **Crear orden** (route path can stay `/links` to avoid a redirect, or be renamed to `/orders/new`).

- **Chosen:** keep the `/links` path, change the nav label to "Crear orden", and render both the link generator and the direct-entry form on that page. Move `CreateOrderForm` off the orders view onto this page (rendered inline rather than as a modal, since the page is now dedicated to creation).
- **Alternative — new `/orders/new` route:** cleaner URL semantics but adds a redirect and touches more files for no PoC benefit. Rejected.
- **Why:** minimizes routing churn; the nav label is what the manager actually sees, and the spec change is about the label + the view's responsibility, not the URL.

### Decision 2: Both paths stay as separate backend calls; the view composes them
The "Crear orden" view renders two sections: "Por link" (phone → `createLink`) and "Cargar orden" (phone + items + message → `createOrder`). No backend unification.

- **Why:** the two flows have genuinely different semantics (one mints a token and waits for the customer; the other records a completed order). Merging them server-side would add status/branching complexity for zero PoC value.

### Decision 3: `message` is a nullable string column on `Order`, optional everywhere
Add `message String?` to the Prisma `Order` model (new migration), add optional `message?: string` to `CreateOrderRequest` (shared) and `CreateOrderDto` (`@IsOptional() @IsString()`), and persist it in `OrdersService` create. Absent/empty → stored as `null`.

- **Alternatives considered:** a separate `OrderMessage` table (over-engineered for one nullable text field, no 1:N need); reusing an existing column (none fits). Rejected.
- **Why:** a nullable column is the minimal, queryable shape for "paired (message → order) training data," and matches the existing pattern of plain columns on `Order`.

### Decision 4: Empty message normalizes to null
The form field is optional; an empty or whitespace-only string is persisted as `null` rather than an empty string, so "no message captured" is unambiguous in the data.

## Risks / Trade-offs

- **[Free-text PII in `message`]** → WhatsApp messages may contain customer names/addresses. Acceptable for an internal PoC training corpus; note it as a consideration if this leaves PoC. No masking in scope.
- **[Removing "+ New order" from orders view changes manager muscle memory]** → Mitigated by the nav rename making "Crear orden" the obvious destination; both paths are co-located there.
- **[Path/label mismatch if `/links` route kept]** → Low risk; nav label drives discoverability. Document the kept path in tasks so it isn't mistaken for an oversight.
- **[Migration on SQLite]** → Adding a nullable column is a safe, backward-compatible migration with no backfill; existing orders get `message = null`.

## Migration Plan

1. Add `message String?` to `Order` in `schema.prisma`; generate a Prisma migration.
2. Extend shared `CreateOrderRequest` and `CreateOrderDto` with optional `message`; persist in `OrdersService`.
3. Front end: relabel nav to "Crear orden"; move `CreateOrderForm` onto the combined view with the new message textarea; remove the "+ New order" trigger from the orders view.
4. No rollback complexity: the column is nullable and additive; reverting the front end leaves the column harmlessly unused.

## Open Questions

- Keep the route path as `/links` or rename to `/orders/new`? (Leaning keep-`/links`; resolve during tasks — does not affect specs.)
- Should the orders view eventually surface the captured `message`? Out of scope here; flagged for a future change.
