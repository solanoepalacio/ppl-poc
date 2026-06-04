## 1. Script injection & config

- [x] 1.1 Create `packages/frontend/src/app/UmamiScript.tsx` (Server Component): returns `null` unless `process.env.NODE_ENV === 'production'`; otherwise renders `<Script defer strategy="afterInteractive" src={host + '/script.js'} data-website-id={websiteId} />` using `next/script`. Resolve `host` from `NEXT_PUBLIC_UMAMI_HOST` (default `http://umami.home:3000`) and `websiteId` from `NEXT_PUBLIC_UMAMI_WEBSITE_ID` (default `92aac9e1-8f20-4385-ad2d-df7e99619fdf`).
- [x] 1.2 Import and render `<UmamiScript />` in `packages/frontend/src/app/layout.tsx` (inside `<body>`).
- [x] 1.3 Document the optional `NEXT_PUBLIC_UMAMI_HOST` / `NEXT_PUBLIC_UMAMI_WEBSITE_ID` vars in `packages/frontend/.env.example` (commented; defaults apply when unset).

## 2. Event helper

- [x] 2.1 Create `packages/frontend/src/lib/analytics.ts` exporting a typed `AnalyticsEvent` union (the 9 event names from the spec) and `trackEvent(name, props?)` that calls `window.umami?.track(name, props)` guarded so it is a no-op (and never throws) when `window.umami` is undefined.
- [x] 2.2 Add a global type declaration for `window.umami.track` (e.g. in `analytics.ts` or a `.d.ts`) so call sites are type-checked.

## 3. Customer order instrumentation (`order/[token]/OrderForm.tsx`)

- [x] 3.1 Emit `order_confirmed` (with `{ itemCount, totalQuantity }`) on successful form confirmation.
- [x] 3.2 Emit `whatsapp_fallback_selected` when the customer continues via WhatsApp.
- [x] 3.3 Emit `order_link_invalid` when the form renders the expired/already-used state.

## 4. Back-office instrumentation

- [x] 4.1 In `CreateOrderModal.tsx`: emit `order_link_generated` when a link is generated, `order_link_copied` when it is copied, and `order_created_direct` (with `{ itemCount, totalQuantity }`) on direct order creation.
- [x] 4.2 In `OrderStatusControl.tsx`: emit `order_status_changed` with `{ fromStatus, toStatus }`.
- [x] 4.3 In `OrderActions.tsx`: emit `order_items_edited` on item edit save and `order_deleted` on delete.

## 5. Event taxonomy documentation

- [x] 5.1 Create `packages/frontend/docs/analytics-events.md` listing every custom event (name, trigger, properties) plus a note that page views are tracked automatically by umami, and the enable/disable (NODE_ENV) and host/website-id config behavior.
- [x] 5.2 Verify the doc covers exactly the events emitted in code (no missing or stale entries) and matches the `AnalyticsEvent` union in `analytics.ts`.

## 6. Verification

- [ ] 6.1 Run `next dev` locally and confirm no umami script in the DOM and no requests to the umami host.
- [ ] 6.2 Build/preview in production mode and confirm the script loads, a page view registers, and a sample custom event (e.g. `order_confirmed`) reaches umami.
- [x] 6.3 Run the frontend typecheck/lint to confirm typed event names and `window.umami` declaration compile cleanly.
