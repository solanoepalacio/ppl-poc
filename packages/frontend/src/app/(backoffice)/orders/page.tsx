import {
  getClients,
  getOrdersBySlot,
  getProducts,
  getSlotExistence,
  getSlotProduced,
  getSlots,
} from '@/lib/api';
import { SlotPicker } from '../SlotPicker';
import { ViewHeader } from '../ViewHeader';
import { CloseSlotButton } from './CloseSlotButton';
import { CreateOrderModal } from './CreateOrderModal';
import { GenerateLinkModal } from './GenerateLinkModal';
import { ExistenceEditor } from './ExistenceEditor';
import { ProducedEditor } from './ProducedEditor';
import { OrdersTable } from './OrdersTable';

/**
 * Back-office orders view: the orders in the selected production bloque (default
 * the open one) as an expandable table. Selecting a bloque in the toolbar
 * navigates immediately, so the selection lives in the URL (?slotId=...). The
 * slate toolbar is also where bloques are managed — always "Agregar pedido",
 * plus (open bloque only) "Cerrar bloque" and "Ver stock".
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
  // The bloque actions only apply to the open bloque. On any other bloque they
  // show grayed out and unclickable rather than disappearing. Existencia and
  // producción real are only fetched (and editable) for the open bloque.
  const isOpen = view.slot.status === 'open';
  const [existence, produced] = isOpen
    ? await Promise.all([
        getSlotExistence(view.slot.id),
        getSlotProduced(view.slot.id),
      ])
    : [null, null];
  const count = view.orders.length;

  return (
    <>
      <ViewHeader
        title="Pedidos"
        subtitle={`${count} ${count === 1 ? 'pedido' : 'pedidos'} en este bloque`}
      />
      <div className="bo-content">
        <SlotPicker
          basePath="/orders"
          slots={slots}
          currentSlotId={view.slot.id}
          closed={!isOpen}
          action={
            <>
              <ExistenceEditor
                slotId={view.slot.id}
                products={products}
                current={existence?.items ?? []}
                disabled={!isOpen}
              />
              <ProducedEditor
                slotId={view.slot.id}
                products={products}
                current={produced?.items ?? []}
                disabled={!isOpen}
              />
              <GenerateLinkModal clients={clients} disabled={!isOpen} />
              <CreateOrderModal
                products={products}
                clients={clients}
                disabled={!isOpen}
              />
              <CloseSlotButton disabled={!isOpen} />
            </>
          }
        />

        <OrdersTable orders={view.orders} products={products} />
      </div>
    </>
  );
}
