import type { ProductCategory } from '@pannico/shared';
import { getProductionTotals } from '@/lib/api';
import { ViewHeader } from '../ViewHeader';

/** Per-line copy for the header + toolbar. */
const COPY: Record<ProductCategory, { title: string; subtitle: string }> = {
  salty: { title: 'Producción salados', subtitle: 'Línea salada · cantidades a producir' },
  sweet: { title: 'Producción dulces', subtitle: 'Línea dulce · cantidades a producir' },
};

/**
 * Back-office production view for a single production line: the per-item quantity
 * to produce for the currently open (latest) bloque, summed across its orders and
 * scoped to `category`. Always shows the open bloque — there is no bloque
 * selector — reflecting the current totals each time it loads. Read-only.
 */
export async function ProductionView({
  category,
}: {
  category: ProductCategory;
}) {
  const production = await getProductionTotals(undefined, category);
  const { title, subtitle } = COPY[category];
  const total = production.items.reduce((sum, it) => sum + it.toProduce, 0);

  return (
    <>
      <ViewHeader title={title} subtitle={subtitle} />
      <div className="bo-content">
        {production.items.length > 0 ? (
          <div className="ptable ptable--breakdown" role="table">
            <div className="ptable-head" role="row">
              <div>Producto</div>
              <div className="col-right">Necesario</div>
              <div className="col-right">Stock</div>
              <div className="col-right">A producir</div>
            </div>
            {production.items.map((item) => (
              <div className="ptable-row" role="row" key={item.productId}>
                <div className="ptable-name">{item.name}</div>
                <div className="ptable-num">{item.demand}</div>
                <div className="ptable-num">{item.existence}</div>
                <div className="ptable-qty-cell">
                  <span
                    className={
                      item.toProduce > 0 ? 'ptable-qty' : 'ptable-qty ptable-qty--covered'
                    }
                  >
                    {item.toProduce}
                  </span>
                </div>
              </div>
            ))}
            <div className="ptable-foot" role="row">
              <div className="ptable-foot-label">Total a producir</div>
              <div className="ptable-foot-total">{total}</div>
            </div>
          </div>
        ) : (
          <p className="muted">
            Nada que producir en el bloque #{production.slot.seq}.
          </p>
        )}
      </div>
    </>
  );
}
