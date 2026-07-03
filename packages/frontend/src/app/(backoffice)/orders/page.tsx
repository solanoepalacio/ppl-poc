import { getClients, getOrdersBySlot, getProducts, getSlots } from '@/lib/api';
import { SlotPicker } from '../SlotPicker';
import { CreateOrderModal } from './CreateOrderModal';
import { OrderActions } from './OrderActions';
import { OrderStatusControl } from './OrderStatusControl';

/**
 * Back-office bloque view: the orders in the selected production bloque (default
 * the open one), each with status, items, and client. Selecting a bloque in the
 * picker navigates immediately, so the selection lives in the URL (?slotId=...).
 */
export default async function OrdersPage({
  searchParams,
}: {
  searchParams: { slotId?: string };
}) {
  const [view, products, { slots }, clients] = await Promise.all([
    getOrdersBySlot(searchParams.slotId),
    getProducts(),
    getSlots(),
    getClients(),
  ]);
  const productName = new Map(products.map((p) => [p.id, p.name]));

  return (
    <section>
      <SlotPicker
        basePath="/orders"
        slots={slots}
        currentSlotId={view.slot.id}
        action={<CreateOrderModal products={products} clients={clients} />}
      />

      {view.orders.length === 0 && (
        <p className="muted">
          No hay órdenes en el bloque #{view.slot.seq}.
        </p>
      )}

      {view.orders.map((order) => (
        <div className="card" key={order.id}>
          <div className="row">
            <strong>{order.clientName}</strong>
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
