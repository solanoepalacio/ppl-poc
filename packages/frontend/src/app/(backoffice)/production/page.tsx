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
      <h1>Daily production</h1>

      <form className="card" method="get">
        <label htmlFor="day">Day </label>
        <input id="day" name="day" type="date" defaultValue={production.day} />{' '}
        <button className="btn-secondary">View</button>
      </form>

      <p className="muted">
        Items to produce on {production.day} (pending, issued, and finished
        orders).
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
        <p className="muted">Nothing to produce on {production.day}.</p>
      )}
    </section>
  );
}
