import { getProducts, getSlotExistence, getSlots } from '@/lib/api';
import { CloseSlotButton } from './CloseSlotButton';
import { ExistenceEditor } from './ExistenceEditor';

/**
 * Back-office bloque management: lists every production bloque (newest first)
 * with its status, span, and order count, and lets the manager close the open
 * bloque — which atomically opens a fresh one so there is always exactly one
 * open bloque for new orders to land in. The open bloque also gets an existencia
 * editor (stock on hand, subtracted from production totals).
 */
export default async function SlotsPage() {
  const { slots } = await getSlots();
  const openSlot = slots.find((s) => s.status === 'open');
  // The existence editor only exists on the open bloque, so fetch its catalog +
  // recorded existence only when there is one.
  const [products, existence] = openSlot
    ? await Promise.all([getProducts(), getSlotExistence(openSlot.id)])
    : [[], null];

  return (
    <section>
      <div
        className="card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <strong>Bloques de producción</strong>
        <CloseSlotButton />
      </div>

      {slots.map((slot) => {
        const opened = new Date(slot.openedAt).toLocaleString();
        const closed = slot.closedAt
          ? new Date(slot.closedAt).toLocaleString()
          : null;
        return (
          <div className="card" key={slot.id}>
            <div className="row">
              <strong>Bloque #{slot.seq}</strong>
              <span className="muted">
                {slot.status === 'open' ? 'abierto' : 'cerrado'}
              </span>
            </div>
            <p className="muted">
              Abierto {opened}
              {closed ? ` · Cerrado ${closed}` : ''}
            </p>
            <p className="muted">
              {slot.orderCount}{' '}
              {slot.orderCount === 1 ? 'orden' : 'órdenes'}
            </p>
            {slot.status === 'open' && existence && (
              <>
                {existence.items.length > 0 && (
                  <p className="muted">
                    {existence.items.length}{' '}
                    {existence.items.length === 1
                      ? 'producto con existencia'
                      : 'productos con existencia'}
                  </p>
                )}
                <ExistenceEditor
                  slotId={slot.id}
                  products={products}
                  current={existence.items}
                />
              </>
            )}
          </div>
        );
      })}
    </section>
  );
}
