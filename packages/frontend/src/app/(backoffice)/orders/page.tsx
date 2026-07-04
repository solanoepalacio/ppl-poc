import {
  getClients,
  getOrdersBySlot,
  getProducts,
  getSlotExistence,
  getSlots,
} from '@/lib/api';
import { SlotPicker } from '../SlotPicker';
import { CloseSlotButton } from './CloseSlotButton';
import { CreateOrderModal } from './CreateOrderModal';
import { ExistenceEditor } from './ExistenceEditor';
import { OrderActions } from './OrderActions';

/**
 * Back-office orders view: the orders in the selected production bloque (default
 * the open one), each with its items and client. Selecting a bloque in the
 * picker navigates immediately, so the selection lives in the URL (?slotId=...).
 * This view is also where bloques are managed — below the selector sit the
 * bloque actions: always "Agregar pedido", plus (open bloque only) "Editar
 * stock" and "Cerrar producción".
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
  // All three bloque actions only apply to the open bloque. On any other bloque
  // they show grayed out and unclickable rather than disappearing. Existence is
  // only fetched (and editable) for the open bloque.
  const isOpen = view.slot.status === 'open';
  const existence = isOpen ? await getSlotExistence(view.slot.id) : null;

  return (
    <section>
      <SlotPicker
        basePath="/orders"
        slots={slots}
        currentSlotId={view.slot.id}
        action={
          <>
            <CreateOrderModal
              products={products}
              clients={clients}
              disabled={!isOpen}
            />
            <ExistenceEditor
              slotId={view.slot.id}
              products={products}
              current={existence?.items ?? []}
              disabled={!isOpen}
            />
            <CloseSlotButton disabled={!isOpen} />
          </>
        }
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
