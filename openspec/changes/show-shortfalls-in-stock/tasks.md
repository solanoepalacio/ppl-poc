## 1. List the shortfalls

- [x] 1.1 `ExistenceEditor.tsx`: change the row filter from
  `initial > 0 || current > 0` to `initial > 0 || current !== 0`, so a negative
  stock actual lists and a product with a typed initial survives landing on zero.
- [x] 1.2 Update the component's doc comment, which explains why a shortfall is
  deliberately left out.

## 2. Remove the stale filter behind it

- [x] 2.1 `slots.service.ts`: `stockOf` returns a pre-filtered `items` alongside
  `all`, encoding the old rule. Every caller destructures only `all`. Drop it —
  left in place it is a second, now-wrong answer to which products the control
  lists, waiting for someone to reach for it.
- [x] 2.2 Re-point any test that asserts on it.

## 3. Verify

- [x] 3.1 Frontend `lint`; backend `lint` + `test`.
- [x] 3.2 Reproduce the reported case against the running app — no scratch data
  needed, the live bloque already held it: **Galletitas de almendras**, no stock
  inicial, one unit ordered, now listed as `inicial 0 · actual −1`. Three more
  shortfalls surfaced with it, including Baguetta Rustica at −99. The control went
  from 9 rows to 13.
- [x] 3.3 Confirm a product with an initial that demand consumes exactly stays
  listed at zero rather than disappearing as it is typed.
- [x] 3.4 Confirm a product with no activity at all is still absent.
- [x] 3.5 Confirm the close warning still lists exactly the shortfalls, since it
  reads its own preview and must not have changed.
