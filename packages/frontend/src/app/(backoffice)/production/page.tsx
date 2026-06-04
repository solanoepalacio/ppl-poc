import { getProductionTotals } from '@/lib/api';

/**
 * Back-office daily production view: the per-item quantity to produce on the
 * selected day (default today), summed across pending, issued, and finished
 * orders. The date picker submits via GET so the day lives in the URL
 * (?day=YYYY-MM-DD), mirroring the orders day view.
 */
export default async function ProductionPage({
  searchParams,
}: {
  searchParams: { day?: string };
}) {
  const production = await getProductionTotals(searchParams.day);

  return (
    <section>
      <h1>Producción diaria</h1>

      <form className="card" method="get">
        <label htmlFor="day">Día </label>
        <input id="day" name="day" type="date" defaultValue={production.day} />{' '}
        <button className="btn-secondary">Ver</button>
      </form>

      <p className="muted">
        Artículos a producir el {production.day} (órdenes pendientes, emitidas y
        finalizadas).
      </p>

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
        <p className="muted">Nada que producir el {production.day}.</p>
      )}
    </section>
  );
}
