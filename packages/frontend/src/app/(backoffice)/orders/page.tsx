import { getOrdersByDay, getProducts } from '@/lib/api';
import { DayPicker } from './DayPicker';
import { OrderActions } from './OrderActions';
import { OrderStatusControl } from './OrderStatusControl';

/**
 * Back-office day view: orders created on the selected day (default today),
 * each with status, items, and phone. Selecting a day in the picker navigates
 * immediately, so the selected day lives in the URL (?day=YYYY-MM-DD).
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
      <h1>Órdenes</h1>

      <DayPicker day={view.day} />

      {view.orders.length === 0 && (
        <p className="muted">No hay órdenes creadas el {view.day}.</p>
      )}

      {view.orders.map((order) => (
        <div className="card" key={order.id}>
          <div className="row" style={{ borderBottom: '1px solid #eee' }}>
            <strong>{order.phone}</strong>
            <OrderStatusControl orderId={order.id} status={order.status} />
          </div>
          <p className="muted">
            Creada {new Date(order.createdAt).toLocaleString()}
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
            <p className="muted">Sin artículos.</p>
          )}
          <OrderActions
            orderId={order.id}
            items={order.items}
            products={products}
          />
        </div>
      ))}
    </section>
  );
}
