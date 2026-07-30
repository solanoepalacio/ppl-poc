import type { ProductCategory, ProductionTotalItem } from '@pannico/shared';
import { getProductionTotals } from '@/lib/api';
import { ViewHeader } from '../ViewHeader';
import { AutoRefresh } from './AutoRefresh';
import { AutoScroll } from './AutoScroll';

/** Per-line title. The supporting line is the same on both views. */
const TITLE: Record<ProductCategory, string> = {
  salty: 'Producción salados',
  sweet: 'Producción dulces',
};
const SUBTITLE = 'Cantidades a producir según pedidos';

/**
 * One half of the split layout. Rows alternate their text colour by position
 * *within this table*, so both halves start on the same colour and stay in step
 * across the screen — keying off the global index would put them out of phase
 * and the stripes would read as noise. The colour is a reading aid only; it says
 * nothing about the product.
 */
function ProductionTable({ items }: { items: ProductionTotalItem[] }) {
  if (items.length === 0) {
    return null;
  }
  return (
    <div className="ptable" role="table">
      <div className="ptable-head" role="row">
        <div>Producto</div>
        <div className="col-right">A producir</div>
      </div>
      {items.map((item, i) => (
        <div
          className={i % 2 === 0 ? 'ptable-row alt-a' : 'ptable-row alt-b'}
          role="row"
          key={item.productId}
        >
          <div className="ptable-name">{item.name}</div>
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
    </div>
  );
}

/**
 * Back-office production view for a single production line: the per-item quantity
 * to produce for the currently open (latest) bloque, scoped to `category`. Always
 * shows the open bloque — there is no bloque selector. Read-only; kept current by
 * <AutoRefresh /> and cycled through by <AutoScroll /> when the list overflows.
 *
 * Laid out as two tables side by side with products alternating between them, so
 * roughly twice as many fit before anything scrolls — these views are read off a
 * screen in the production area, where scrolling means walking over. Only the
 * quantity to produce is shown; demand and existencia stay in the API response
 * (they are what `toProduce` is computed from) but are not figures the line acts
 * on, and no line total: a summed figure is not something the line acts on.
 */
export async function ProductionView({
  category,
}: {
  category: ProductCategory;
}) {
  const production = await getProductionTotals(undefined, category);

  // Zig-zag: the list reads across before it reads down.
  const left = production.items.filter((_, i) => i % 2 === 0);
  const right = production.items.filter((_, i) => i % 2 === 1);

  return (
    <>
      <AutoRefresh />
      <AutoScroll />
      <ViewHeader
        title={TITLE[category]}
        subtitle={SUBTITLE}
        modifier="bo-header--production"
      />
      <div className="bo-content">
        {production.items.length > 0 ? (
          <div className="ptable-split">
            <ProductionTable items={left} />
            <ProductionTable items={right} />
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
