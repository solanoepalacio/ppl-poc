import { getSlots } from '@/lib/api';
import { CloseSlotButton } from './CloseSlotButton';

/**
 * Back-office bloque management: lists every production bloque (newest first)
 * with its status, span, and order count, and lets the manager close the open
 * bloque — which atomically opens a fresh one so there is always exactly one
 * open bloque for new orders to land in.
 */
export default async function SlotsPage() {
  const { slots } = await getSlots();

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
          </div>
        );
      })}
    </section>
  );
}
