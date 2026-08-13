import { getManagedProducts, getOpenSlot, getSlotStock } from '@/lib/api';
import { ViewHeader } from '../ViewHeader';
import { ProductCatalog } from './ProductCatalog';

/**
 * Back-office Productos view: the whole catalog, retired products included, with
 * the controls to maintain it. Its own destination for the same reason Clientes
 * is — the catalog is edited rarely and deliberately, not in the middle of
 * taking an order.
 *
 * The stock actual shown against each product is the **open bloque's**, which is
 * the only one it could be: stock is recorded per bloque, and the catalog is not
 * scoped to one. The bloque is named in the subtitle so the figure cannot be
 * read as a standing inventory. A product the bloque has no existencia,
 * producción or demand for is at zero and simply absent from that response.
 */
export default async function ProductosPage() {
  const [products, slot] = await Promise.all([
    getManagedProducts(),
    getOpenSlot(),
  ]);
  const { items } = await getSlotStock(slot.id);
  const stock = Object.fromEntries(items.map((i) => [i.productId, i.current]));

  const active = products.filter((p) => p.active).length;
  const stocked = products.filter((p) => p.active && p.threshold > 0).length;
  const counts =
    products.length === active
      ? `${active} ${active === 1 ? 'producto' : 'productos'}`
      : `${active} activos · ${products.length - active} inactivos`;

  return (
    <>
      <ViewHeader
        title="Productos"
        subtitle={`${counts} · ${stocked} con umbral · stock del bloque #${slot.seq}`}
      />
      <div className="bo-content">
        <ProductCatalog products={products} stock={stock} />
      </div>
    </>
  );
}
