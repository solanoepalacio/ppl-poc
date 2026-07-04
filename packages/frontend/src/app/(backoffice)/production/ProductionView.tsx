import type { ProductCategory } from '@pannico/shared';
import { getProductionTotals } from '@/lib/api';

/**
 * Back-office production view for a single production line: the per-item quantity
 * to produce for the currently open (latest) bloque, summed across its orders and
 * scoped to `category`. Always shows the open bloque — there is no bloque
 * selector — reflecting the current totals each time it loads. Rendered by the
 * two category pages.
 */
export async function ProductionView({
  category,
}: {
  category: ProductCategory;
}) {
  const production = await getProductionTotals(undefined, category);

  return (
    <section>
      {production.items.length > 0 ? (
        <div className="card">
          <ul>
            {production.items.map((item) => (
              <li key={item.productId}>
                {item.name} × {item.quantity}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="muted">
          Nada que producir en el bloque #{production.slot.seq}.
        </p>
      )}
    </section>
  );
}
