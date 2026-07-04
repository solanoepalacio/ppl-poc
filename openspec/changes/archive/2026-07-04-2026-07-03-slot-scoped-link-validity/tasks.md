## 1. Data model & migration

- [x] 1.1 Remove `expiresAt` from the `Order` model in `schema.prisma` (drop the field and its doc comment)
- [x] 1.2 Author migration `20260703150000_drop_order_expires_at`: SQLite RedefineTable rebuilding `Order` without `expiresAt`, copying every other column, and recreating the `token` unique index plus the `createdAt`/`status`/`slotId` indexes
- [x] 1.3 Regenerate the Prisma client (`yarn prisma generate`)

## 2. Shared contract

- [x] 2.1 `dtos.ts`: replace `CreateLinkResponse.expiresAt: string` with `slotSeq: number`
- [x] 2.2 `models.ts`: remove `expiresAt` from the `Order` model type (and its doc comment)

## 3. Backend — validity is slot-scoped

- [x] 3.1 `token.service.ts`: `isValid` = `pending && slot.status === 'open'`; `TokenValidatable` gains the slot's status; `findOrderByToken` includes `{ slot: true }`
- [x] 3.2 `token.guard.ts`: update the doc comment and rejection message from "expired" to closed-bloque wording
- [x] 3.3 `slots.service.ts`: in the `closeSlot` transaction, flip the bloque's `pending` orders to `ignored` (`tx.order.updateMany`) before opening the next bloque
- [x] 3.4 `expiry.service.ts`: repurpose `sweepExpired` to target `pending` orders whose slot is `closed` (backstop reconciliation), update the doc comment

## 4. Backend — remove the fixed TTL

- [x] 4.1 Delete `config/token.config.ts`
- [x] 4.2 `links.service.ts`: drop `computeExpiry`/`expiresAt`; read the open slot (not just its id) and return `slotSeq`
- [x] 4.3 `orders.service.ts`: drop the `computeExpiry()` import and the `expiresAt` stamp in `createOrder`

## 5. Frontend

- [x] 5.1 `CreateOrderModal.tsx`: replace the "expira {timestamp}" line with "válido durante el bloque #{slotSeq}"
- [x] 5.2 `lib/api.ts`: throw a typed `ApiError` carrying the HTTP `status` (still an `Error` with the server message)
- [x] 5.3 Extract the invalid-link view into a shared `InvalidLinkNotice` component; reuse it in `page.tsx`
- [x] 5.4 `OrderForm.tsx`: on a 404 from confirm/whatsapp, switch to the invalid-link view instead of an inline error (bloque closed mid-form)

## 6. Docs & env

- [x] 6.1 Remove `ORDER_TOKEN_TTL_HOURS` from `README.md` and `packages/backend/.env.example`

## 7. Tests

- [x] 7.1 `expiry.service.spec.ts`: assert the sweep targets `pending` + `slot.status === 'closed'` → `ignored`
- [x] 7.2 `slots.service.spec.ts`: give the tx mock an `order.updateMany`; assert `closeSlot` flips the bloque's `pending` orders to `ignored`
- [x] 7.3 `orders.service.spec.ts`: fixtures carry a `slot`; the "expired token" cases become "closed-bloque" cases; drop the `expiresAt` assertion in `createOrder`
- [x] 7.4 `links.service.spec.ts`: mock `getOpenSlot` returning a slot with `seq`; assert `slotSeq` in the response
- [x] 7.5 Backend typecheck (`lint`) and full Jest suite green
