import type { ProductCategory, ProductionTotalItem } from '@pannico/shared';
import { getProductionTotals } from '@/lib/api';
import { ViewHeader } from '../ViewHeader';
import { AutoRefresh } from '../AutoRefresh';
import { AutoScroll } from '../AutoScroll';

/** Per-line title. The supporting line is the same on both views. */
const TITLE: Record<ProductCategory, string> = {
  salty: 'Producción salados',
  sweet: 'Producción dulces',
};
/**
 * No longer "según pedidos": a row can be here with no order behind it, because
 * the product is under the threshold the bakery wants on the shelf. Saying
 * otherwise would have somebody on the line looking for the order that explains
 * a number, and not finding one.
 */
const SUBTITLE = 'Cantidades a producir';

/**
 * How many recetas a quantity comes to, for the line to read instead of dividing
 * in their heads — which is what they do today, product by product, off a screen
 * across the room.
 *
 * An em dash when the product has no receta recorded. A zero would read as "no
 * work", which is the opposite of what a row on this screen means: every row here
 * is something still to bake.
 *
 * Two decimals, es-AR, and formatted on the server — this is a Server Component,
 * so the locale cannot resolve one way in Node and another in the browser. A
 * fraction is shown rather than rounded up to a whole receta: a quarter batch is
 * something the person at the mixer already knows how to make, and rounding up
 * would invent units that nothing downstream accounts for.
 */
function recipesOf(toProduce: number, recipeSize: number): string | null {
  if (recipeSize <= 0) return null;
  return (toProduce / recipeSize).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

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
        <div className="col-right">Recetas</div>
      </div>
      {items.map((item, i) => (
        <div
          className={i % 2 === 0 ? 'ptable-row alt-a' : 'ptable-row alt-b'}
          role="row"
          key={item.productId}
        >
          <div className="ptable-name">{item.name}</div>
          <div className="ptable-qty-cell">
            <span className="ptable-qty">{item.toProduce}</span>
          </div>
          {/* Beside the units, not instead of them: the order was placed in
              units and the stock is counted in units, so a line that only had
              recetas could not check its work against anything else. */}
          <div className="ptable-qty-cell">
            {/* The pill is the figure's treatment, so a product with no receta
                gets no pill: a filled one holding a dash reads as a control with
                nothing in it rather than as an absence. */}
            {recipesOf(item.toProduce, item.recipeSize) === null ? (
              <span className="ptable-recipes-none">—</span>
            ) : (
              <span className="ptable-recipes">
                {recipesOf(item.toProduce, item.recipeSize)}
              </span>
            )}
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
 * quantity to produce is shown; demand, existencia and producción real stay in
 * the API response (they are what `toProduce` is computed from) but are not
 * figures the line acts on, and no line total: a summed figure is not something
 * the line acts on either.
 *
 * A **work queue, not a manifest**: a product whose quantity to produce has
 * reached zero is finished, and drops off the screen rather than occupying a row
 * with a 0 in it. The filter is here rather than in the API on purpose — the
 * totals keep reporting covered products so the figure stays available and
 * auditable on the orders view; it is only this screen that has no use for them.
 * When everything is done the view is empty, which is the signal.
 */
export async function ProductionView({
  category,
}: {
  category: ProductCategory;
}) {
  const production = await getProductionTotals(undefined, category);
  const pending = production.items.filter((item) => item.toProduce > 0);

  // Zig-zag: the list reads across before it reads down.
  const left = pending.filter((_, i) => i % 2 === 0);
  const right = pending.filter((_, i) => i % 2 === 1);

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
        {pending.length > 0 ? (
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
