## 1. Shared contract

- [x] 1.1 Replace `ProductionTotalItem.quantity` with `demand`, `existence`, and `toProduce` (net = demand − existence, may be negative); document that `toProduce` is not floored

## 2. Backend — production totals

- [x] 2.1 `getProductionTotals`: emit `{ productId, name, demand, existence, toProduce }` per product — carry the summed demand and the bloque's existencia through, compute `toProduce = demand − existence` without flooring, and drop the `> 0` filter (keep only the inherent "no demand ⇒ absent")
- [x] 2.2 Update `orders.service.spec.ts`: assert the new three-field shape; replace the "drops a covered product" case with "keeps a covered product, netting to zero / negative"; keep the sort, category, and no-demand cases

## 3. Frontend — production views

- [x] 3.1 `ProductionView.tsx`: render three columns per row — **Necesario** (demand), **Stock** (existencia), **A producir** (toProduce); total `toProduce` in the footer; style non-positive `A producir` distinctly (surplus / nothing to bake)
- [x] 3.2 `globals.css`: widen the `.ptable` grid to the name column plus three numeric columns; make the footer label span up to the last column

## 4. Verification

- [x] 4.1 Typecheck all workspaces (`yarn workspaces foreach -At run lint`) and run backend tests
- [x] 4.2 `openspec validate show-production-stock-breakdown --strict`
