import type { SlotViewOrder } from '@pannico/shared';
import { getOrdersBySlot, getProducts, getSlots } from '@/lib/api';
import { AutoRefresh } from '../AutoRefresh';
import { AutoScroll } from '../AutoScroll';
import { SlotPicker } from '../SlotPicker';
import { ViewHeader } from '../ViewHeader';

/** How many products share a row. The band is drawn per row, so this is markup. */
const PER_ROW = 3;

/** Splits a list into fixed-size chunks, the last one short. */
function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/** A client's whole order for the bloque: their products, each summed. */
type ClientOrder = {
  clientId: string;
  clientName: string;
  products: { productId: string; name: string; quantity: number }[];
};

/**
 * Folds a bloque's orders into one record per client.
 *
 * A client who ordered three times is one record, and a product they ordered in
 * more than one of those is one figure — the sum. That is the whole difference
 * from the orders view, which lists orders: for someone packing, "how many of
 * this does this client get" is the question, and it is not answerable from
 * three separate rows without adding them up by hand.
 *
 * Sorted by name, clients and products alike. This view is looked *up* in — find
 * the client, find the product — unlike the editing dialogs, where the manager
 * is re-reading a sequence they just performed and entry order is what matches
 * their memory.
 */
function groupByClient(
  orders: SlotViewOrder[],
  productName: Map<string, string>,
): ClientOrder[] {
  const byClient = new Map<string, ClientOrder>();

  for (const order of orders) {
    let entry = byClient.get(order.clientId);
    if (!entry) {
      entry = {
        clientId: order.clientId,
        clientName: order.clientName,
        products: [],
      };
      byClient.set(order.clientId, entry);
    }
    for (const item of order.items) {
      const existing = entry.products.find((p) => p.productId === item.productId);
      if (existing) existing.quantity += item.quantity;
      else
        entry.products.push({
          productId: item.productId,
          name: productName.get(item.productId) ?? item.productId,
          quantity: item.quantity,
        });
    }
  }

  return [...byClient.values()]
    // A client whose orders are all empty has nothing to review; the view
    // answers what was ordered, and "nothing" is not a record.
    .filter((c) => c.products.length > 0)
    .map((c) => ({
      ...c,
      products: [...c.products].sort((a, b) => a.name.localeCompare(b.name, 'es')),
    }))
    .sort((a, b) => a.clientName.localeCompare(b.clientName, 'es'));
}

/**
 * Back-office **Revisar Pedidos**: what each client ordered in the selected
 * bloque, for the people packing and baking.
 *
 * Read-only by design — no edit, no delete, and nothing to expand. Every product
 * is on screen as soon as the page renders, laid out three to a row so a client
 * with a dozen products costs four lines instead of twelve and the next client
 * still fits above the fold.
 *
 * Unattended, like the production views: <AutoRefresh /> re-reads the bloque so a
 * screen on the wall is never showing the orders as they stood when someone
 * happened to open it, and <AutoScroll /> cycles the list when there are more
 * clients than fit, so the ones at the bottom are not permanently unread.
 */
export default async function RevisarPedidosPage({
  searchParams,
}: {
  searchParams: { slotId?: string };
}) {
  const [view, products, { slots }] = await Promise.all([
    getOrdersBySlot(searchParams.slotId),
    getProducts(),
    getSlots(),
  ]);

  const productName = new Map(products.map((p) => [p.id, p.name]));
  const clients = groupByClient(view.orders, productName);
  const totalUnits = clients.reduce(
    (sum, c) => sum + c.products.reduce((n, p) => n + p.quantity, 0),
    0,
  );

  return (
    <>
      <AutoRefresh />
      <AutoScroll />
      <ViewHeader
        title="Revisar pedidos"
        modifier="bo-header--review"
        subtitle={
          clients.length === 0
            ? 'Sin pedidos en este bloque'
            : `${clients.length} ${clients.length === 1 ? 'cliente' : 'clientes'} · ${totalUnits} unidades`
        }
      />
      <div className="bo-content">
        <SlotPicker
          basePath="/revisar-pedidos"
          slots={slots}
          currentSlotId={view.slot.id}
          closed={view.slot.status !== 'open'}
        />

        {clients.length === 0 ? (
          <p className="muted items-empty">
            Todavía no hay pedidos en este bloque.
          </p>
        ) : (
          <ul className="review-list">
            {clients.map((client) => (
              <li className="review-client" key={client.clientId}>
                <h2 className="review-client-name">{client.clientName}</h2>
                {/* Grouped into rows in the markup rather than left to the grid
                    to auto-flow: the colour band is the row, and a band drawn on
                    the cells stops wherever a short last row runs out of
                    products, leaving the card showing through the gap. */}
                <div className="review-products">
                  {chunk(client.products, PER_ROW).map((row) => (
                    <ul className="review-row" key={row[0].productId}>
                      {row.map((p) => (
                        <li className="review-product" key={p.productId}>
                          <span className="review-product-name">{p.name}</span>
                          <span className="review-product-qty">x {p.quantity}</span>
                        </li>
                      ))}
                    </ul>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
