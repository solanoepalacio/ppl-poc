## 1. Refuse the close

- [x] 1.1 `SlotsService.closeSlot`: read the bloque's stock inside the transaction
  as it already does, and reject before any write when any product's stock actual
  is below zero. Before the update, not after — a rejection that has already
  closed the bloque is not a rejection.
- [x] 1.2 Name the short products and their amounts in the rejection message, so
  a caller that never saw the preview still learns what to do about it.
- [x] 1.3 Leave the carry's clamp alone. It stays correct and simply becomes
  unreachable through closing.

## 2. The control

- [x] 2.1 `CloseSlotButton`: the shortfall dialog loses **Cerrar igual**. It keeps
  the list and says the bloque cannot be closed until those products are produced.
- [x] 2.2 Reword the copy: it no longer warns about discarding, it explains a
  refusal and what unblocks it.
- [x] 2.3 The preview call stays as the fast path, but the button must handle the
  backend refusing anyway — the two can disagree if an order lands in between.

## 3. Tests

- [x] 3.1 A bloque with a negative stock actual is not closed: no successor, and
  the bloque stays open.
- [x] 3.2 The rejection names the short products.
- [x] 3.3 A bloque with none negative still closes and still carries.
- [x] 3.4 A product at exactly zero does not block.

## 4. Verify

- [x] 4.1 Backend `lint` + `test`; frontend `lint`.
- [x] 4.2 Drive it on a scratch bloque, never Pablo's: with a shortfall the close
  is refused and the bloque survives; after recording the missing production it
  closes and carries.

## 5. Analytics that the escape hatch left behind

- [x] 5.1 Drop `slot_close_cancelled`: with no "Cerrar igual" there is no decision
  to back out of, so every prompt would end in it and the event distinguishes
  nothing.
- [x] 5.2 Drop the shortfall properties from `slot_closed`, including
  `hadShortfall`, which can no longer be `true`.
- [x] 5.3 Rename `slot_close_shortfall_shown` to `slot_close_blocked` — it is no
  longer a warning that was shown, it is a close that was refused — and keep it:
  how often the rule fires and how deep the hole is is the one thing worth
  knowing about it.
- [x] 5.4 Drop the `prompt` ref it needed. It existed to report an outcome once
  across three exits; there is one exit now.
- [x] 5.5 Update `analytics.ts`'s event union and `docs/analytics-events.md`,
  whose closing paragraph explained the trio.
