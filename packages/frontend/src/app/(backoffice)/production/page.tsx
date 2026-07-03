import { getProductionTotals, getSlots } from '@/lib/api';
import { SlotPicker } from '../SlotPicker';

/**
 * Back-office production view: the per-item quantity to produce for the selected
 * bloque (default the open one), summed across pending, issued, and finished
 * orders. Selecting a bloque in the picker navigates immediately, so the
 * selection lives in the URL (?slotId=...), mirroring the orders bloque view.
 */
export default async function ProductionPage({
  searchParams,
}: {
  searchParams: { slotId?: string };
}) {
  const [production, { slots }] = await Promise.all([
    getProductionTotals(searchParams.slotId),
    getSlots(),
  ]);

  return (
    <section>
      <SlotPicker
        basePath="/production"
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
