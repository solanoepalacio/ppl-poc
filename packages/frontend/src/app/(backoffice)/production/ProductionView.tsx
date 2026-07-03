import type { ProductCategory } from '@pannico/shared';
import { getProductionTotals, getSlots } from '@/lib/api';
import { SlotPicker } from '../SlotPicker';

/**
 * Back-office production view for a single production line: the per-item quantity
 * to produce for the selected bloque (default the open one), summed across
 * pending, issued, and finished orders, scoped to `category`. Selecting a bloque
 * navigates immediately, so the selection lives in the URL (?slotId=...); each
 * line has its own `basePath` (/production/salados or /production/dulces) so the
 * picker stays within this view. Rendered by the two category pages.
 */
export async function ProductionView({
  basePath,
  category,
  slotId,
}: {
  basePath: string;
  category: ProductCategory;
  slotId?: string;
}) {
  const [production, { slots }] = await Promise.all([
    getProductionTotals(slotId, category),
    getSlots(),
  ]);

  return (
    <section>
      <SlotPicker
        basePath={basePath}
        slots={slots}
        currentSlotId={production.slot.id}
      />

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
