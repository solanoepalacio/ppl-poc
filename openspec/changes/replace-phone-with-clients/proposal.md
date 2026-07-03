## Why

Orders are identified by a free-text customer **phone number** that the manager types
in on every order (via the Argentine two-field entry that composes to E.164). In
practice the bakery serves a known, recurring set of clients, so re-typing a phone
number each time is slow, error-prone, and produces inconsistent identifiers for the
same client. Attaching orders to a **predefined client** instead makes the common case a
single pick, keeps client identity consistent, and gives a stable key to build on later.

This change replaces the phone number with a fixed **client directory**. An order is
attached to exactly one `Client`. The directory is loaded via Prisma data migrations
(the same "fixed preset list via migration, no management UI" pattern the product
catalog uses); more clients are added later with further data migrations. In the
order-creation modal the phone-entry control becomes a **filterable client dropdown**:
the manager types part of a name to narrow the list and picks a client.

## What Changes

- Add a **Client** entity: `id`, `name` (UI-friendly display), `slug` (normalized,
  unique natural key), `active`. Add a required `clientId` FK on `Order`; **remove
  `Order.phone`**.
- Clients are **loaded by data migration** (placeholder + the supplied initial list);
  there is no client-management UI. Retiring a client is `active: false`, never a delete.
- **Existing orders** are backfilled to a placeholder client (`Cliente sin asignar`) so
  `clientId` can be `NOT NULL`.
- Add `GET /clients` returning the active directory for the back office.
- **BREAKING** (API): `POST /links` and `POST /orders` take `clientId` instead of
  `phone`; link/token/back-office responses carry the client (name) instead of a phone.
- **Frontend:** the order-creation modal swaps the two-field phone control for a
  hand-rolled **type-ahead client selector**; the back-office order list shows the client
  name instead of a phone number.
- Remove the now-dead Argentine phone-composition/normalization helpers.

## Capabilities

### New Capabilities

- `client-directory`: the fixed set of selectable clients loaded via data migration
  (name + normalized slug + active flag, no management UI) and the back-office endpoint
  that lists the active clients an order can be attached to.

### Modified Capabilities

- `order-links`: link generation binds an order to a selected client instead of a phone
  number; token validation resolves the bound client.
- `order-management`: orders persist the client they are for (not a phone); the
  back-office view and manual creation key off the client.
- `order-create-presentation`: the creation modal presents a filterable client selector
  first (replacing the phone-entry control); the two-path choice is unchanged.

### Removed Capabilities

- `phone-entry`: the two-field Argentine phone-entry control is retired — the back office
  no longer captures a phone number anywhere.

## Impact

- **Data**: new `Client` table (`slug` unique, `active`); `Order.clientId` NOT NULL FK
  (`ON DELETE RESTRICT`) with an index, replacing `Order.phone`. Migration
  `<ts>_add_clients` creates `Client`, inserts the placeholder + initial client list, and
  rebuilds `Order` backfilling every existing order to the placeholder client.
- **Backend**: new `ClientsModule`/`ClientsService` (`list`, `assertActive`) and
  `ClientsController` (`GET /clients`). `orders.service` and `links.service` validate a
  `clientId` (rejecting missing/inactive) and store it; read paths resolve the client
  name. `common/phone.util.ts` deleted.
- **Shared**: new `Client` model; `Order.phone`→`clientId`; request/response DTOs move
  from `phone` to `clientId`/`clientName`; `phone.ts` helpers removed; add a
  `normalizeForSearch` helper for client filtering.
- **Frontend**: new `ClientCombobox` (type-ahead) replaces `PhoneField` in
  `CreateOrderModal`; `getClients()` added; orders page fetches and passes clients; order
  rows and the link result show the client name.
- **Tests**: client validation on both create paths (missing/inactive rejected), and the
  order read path surfacing the client.
