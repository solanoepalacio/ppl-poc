## 1. Backend

- [x] 1.1 `getProductionTotals`: compute `toProduce = Math.max(0, demand − existence)`; update the comment (net floors at zero, never negative)
- [x] 1.2 `orders.service.spec.ts`: the "keeps a covered product" case now expects floored nets — demand 8 / existence 10 → `toProduce 0`; demand 4 / existence 4 → `toProduce 0`

## 2. Shared

- [x] 2.1 Update the `ProductionTotalItem.toProduce` doc note: floored at zero, never negative

## 3. Verification

- [x] 3.1 Typecheck all workspaces and run backend tests
- [x] 3.2 `openspec validate floor-net-to-produce-at-zero --strict`
