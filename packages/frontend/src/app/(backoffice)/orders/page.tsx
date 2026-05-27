import { getOrdersByDay, getProducts } from '@/lib/api';
import { OrderStatusControl } from './OrderStatusControl';

/**
 * Back-office day view: orders created on the selected day (default today),
 * each with status, items, and phone. The date picker submits via GET so the
 * selected day lives in the URL (?day=YYYY-MM-DD).
 */
export default async function OrdersPage({
  searchParams,
}: {
  searchParams: { day?: string };
}) {
  const [view, products] = await Promise.all([
    getOrdersByDay(searchParams.day),
    getProducts(),
  ]);
  const productName = new Map(products.map((p) => [p.id, p.name]));

  return (
    <section>
      <h1>Orders</h1>

      <form className="card" method="get">
        <label htmlFor="day">Day </label>
        <input id="day" name="day" type="date" defaultValue={view.day} />{' '}
        <button className="btn-secondary">View</button>
      </form>

      {view.orders.length === 0 && (
        <p className="muted">No orders created on {view.day}.</p>
      )}

      {view.orders.map((order) => (
        <div className="card" key={order.id}>
          <div className="row" style={{ borderBottom: '1px solid #eee' }}>
            <strong>{order.phone}</strong>
            <OrderStatusControl orderId={order.id} status={order.status} />
          </div>
          <p className="muted">
            Created {new Date(order.createdAt).toLocaleString()}
          </p>
          {order.items.length > 0 ? (
            <ul>
              {order.items.map((item) => (
                <li key={item.id}>
                  {productName.get(item.productId) ?? item.productId} ×{' '}
                  {item.quantity}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No items.</p>
          )}
        </div>
      ))}
    </section>
  );
}
