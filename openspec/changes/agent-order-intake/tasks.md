## 1. Schema

- [x] 1.1 Add `source String @default("manual")` to `Order` in `schema.prisma`,
  documenting what it discriminates and why the default is `manual`.
- [x] 1.2 Hand-write `20260807120000_add_order_source/migration.sql` as an `ALTER
  TABLE ... ADD COLUMN` rather than a Prisma table rebuild, following
  `20260806120000_manage_clients` — a rebuild copies every row, and the copy is
  where a rebuild loses data.
- [x] 1.3 `yarn prisma migrate deploy` and `yarn prisma generate`.

## 2. Contract

- [x] 2.1 Add `order-source.ts` to `@pannico/shared` with the `OrderSource` union,
  `ORDER_SOURCES` and `isOrderSource`, mirroring `product-category.ts`; export it
  from the barrel.
- [x] 2.2 Add `reused: boolean` to `CreateLinkResponse`.
- [x] 2.3 Add `ClientByPhoneResponse` to `dtos.ts`.
- [x] 2.4 `yarn workspace @pannico/shared run build`.

## 3. Backend

- [x] 3.1 `ClientsService.findByPhone`, reusing `normalizeClientPhone`, matching
  only active clients, returning `{ found: false }` for a digitless value without
  querying.
- [x] 3.2 `GET /clients/by-phone/:phone` on `ClientsController`, answering 200 with
  `{ found: false }` for an unknown number rather than 404.
- [x] 3.3 `LinksService.createLink` returns the client's existing unconsumed
  link-originated order in the open bloque when there is one, creating only when
  there is not; both branches build the response through one helper.
- [x] 3.4 `OrdersService.createOrder` stamps `source: 'manual'` explicitly.

## 4. Tests

- [x] 4.1 `links.service.spec.ts`: add `findFirst` to the Prisma mock defaulting to
  `null`; cover reuse, fresh creation, and the exact reuse predicate.
- [x] 4.2 `clients.service.spec.ts`: a `findByPhone` block covering resolution,
  normalization, the active-only filter, not-found, and digitless input.

## 5. Verify

- [x] 5.1 `yarn workspace @pannico/backend run lint`
- [x] 5.2 `yarn workspace @pannico/backend run test`
- [x] 5.3 `yarn workspace @pannico/frontend run lint`
- [x] 5.4 `openspec validate --all` — note `spec/backoffice-auth` already fails on
  two requirements missing SHALL/MUST, unrelated to this change.
- [x] 5.5 Drive the flow against a running backend with the seeded test number:
  resolve it bare and formatted, resolve an unknown number, generate a link twice
  and confirm the same token comes back with only one order in the bloque, record
  a manual order for the same client and confirm it is not handed out, confirm the
  order and check a new link is issued, then close the bloque and check the same.
- [ ] 5.6 Check **Generar link** still works from the back office, and that
  generating twice for one client no longer leaves an empty order behind.

## 6. At archive time

- [ ] 6.1 Edit `openspec/specs/client-directory/spec.md`'s `## Purpose` **by hand**.
  Deltas cannot reach it: it enumerates the back-office endpoints that expose the
  directory and would still omit resolving a client by phone, which this change
  adds. Nothing warns about this — the same trap `2026-08-06-manage-clients`
  recorded.
