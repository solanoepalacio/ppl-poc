## 1. Data model & migration

- [x] 1.1 Add a `Client` model to `schema.prisma` (`id`, `name`, `slug` `@unique`,
  `active` default `true`, `orders Order[]`)
- [x] 1.2 On `Order`: remove `phone`, add required `clientId` with a relation to `Client`
  (`onDelete: Restrict`) and `@@index([clientId])`
- [x] 1.3 Author migration `<ts>_add_clients`: create `Client` + unique `slug` index;
  insert the placeholder `Cliente sin asignar` (slug `cliente-sin-asignar`) and the
  initial client list with `INSERT OR IGNORE` on `slug`
- [x] 1.4 Rebuild `Order` (`PRAGMA foreign_keys=OFF`) with a NOT NULL `clientId`,
  backfilling every existing row to the placeholder client and dropping `phone`; recreate
  all `Order` indexes plus `@@index([clientId])`
- [x] 1.5 `prisma generate` so backend code typechecks against the new model

## 2. Shared contract

- [x] 2.1 Add `Client { id; name; slug; active }` to `models.ts`; change `Order.phone` to
  `clientId`
- [x] 2.2 `dtos.ts`: `CreateLinkRequest.phone`→`clientId`; `CreateLinkResponse.phone`→
  `clientName` (+`clientId`); `TokenValidationResponse.phone?`→`clientName?`;
  `CreateOrderRequest.phone`→`clientId`; `SlotViewOrder.phone`→`clientId`+`clientName`
- [x] 2.3 Export `Client`; delete `phone.ts` and its barrel export; add a
  `normalizeForSearch` helper (lowercase + strip accents) for client filtering
- [x] 2.4 Build the shared package (`tsc`) so both sides consume the new contract

## 3. Backend — clients + create/read paths

- [x] 3.1 Add `ClientsModule`, `ClientsService` (`list()` active-only ordered by `name`;
  `assertActive(clientId)` throwing `BadRequestException` on missing/inactive) and
  `ClientsController` (`GET /clients`); register in `AppModule`
- [x] 3.2 `links.service.createLink(clientId)`: validate via `assertActive`, store
  `clientId`, return `clientName`; update `CreateLinkDto` and the controller
- [x] 3.3 `orders.service.createOrder`: replace the phone gate with `assertActive`, store
  `clientId`; update `CreateOrderDto` (`phone`→`clientId`)
- [x] 3.4 `orders.service.validateToken` and `getOrdersBySlot`: include the client and
  return its name (and id)
- [x] 3.5 Delete `common/phone.util.ts` (now unused)

## 4. Frontend

- [x] 4.1 Add `ClientCombobox` — a type-ahead over the injected client list, filtering by
  `normalizeForSearch`, storing the selected `clientId`
- [x] 4.2 `CreateOrderModal`: swap `PhoneField` for `ClientCombobox`; `valid` gates on a
  selected client; send `{ clientId }` on both paths; show `clientName` in the result
- [x] 4.3 `lib/api.ts`: add `getClients()`; update `createLink`/`createOrder` to `clientId`
- [x] 4.4 `orders/page.tsx`: fetch `getClients()` and pass to the modal; render the client
  name on each order row instead of the phone
- [x] 4.5 `globals.css`: add combobox styles; remove the dead `.phone-entry` block. Delete
  `PhoneField.tsx`

## 5. Tests & verification

- [x] 5.1 Update/add backend specs: link + manual create reject a missing/inactive
  `clientId` and persist a valid one; read path surfaces the client
- [x] 5.2 Build shared, run `prisma migrate` + `db:setup`, typecheck backend & frontend,
  run backend tests
- [x] 5.3 Run dev and exercise the modal: filter by name → pick a client → Generar link
  (result shows the client name) and Cargar contenido → create; confirm the back-office
  list shows the client name
- [x] 5.4 `openspec validate replace-phone-with-clients` and `openspec validate --all`
