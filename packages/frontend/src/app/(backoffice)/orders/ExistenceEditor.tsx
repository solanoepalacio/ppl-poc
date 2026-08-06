'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Product, SlotStockItem } from '@pannico/shared';
import { setSlotExistence } from '@/lib/api';
import { ProductCombobox } from './ProductCombobox';
import { Modal } from './Modal';

/** A product's position as the dialog holds it while the initial is being edited. */
type Row = {
  productId: string;
  name: string;
  initial: number;
  produced: number;
  demand: number;
  current: number;
};

/**
 * Open-bloque control for the bloque's stock. Each product shows two figures:
 * the **stock inicial**, typed by the manager or inherited from the previous
 * bloque, which is editable; and the **stock actual**
 * (`inicial + producción real − pedidos`), which is not — it is a reading of
 * three numbers that each have their own control, so there is nothing here to
 * write it to. Editing the initial recomputes it on the spot.
 *
 * Deliberately not built on `ProductPicker`/`SelectedItems`: those are built
 * around "only ever shows what is already on the order", with a remove control
 * that would be meaningless on a row present because of a figure they know
 * nothing about — and they are shared by three other dialogs.
 *
 * Lists a product when its initial is above zero **or** its current is anything
 * other than zero — a shortfall included. A negative stock actual is a real
 * position, and hiding it made the one screen whose subject is stock the one
 * screen that would not say a product was short. A product is left out only when
 * both figures are zero, where there is nothing to report.
 *
 * The `initial > 0` half is not redundant with the other: it keeps a product the
 * manager gave a count to on screen when demand consumes exactly all of it, so
 * the figure just typed cannot vanish as it is typed.
 *
 * Saving is replace-all over the stock inicial only.
 */
export function ExistenceEditor({
  slotId,
  products,
  stock,
  disabled,
}: {
  slotId: string;
  products: Product[];
  stock: SlotStockItem[];
  /** Grayed-out and unclickable when the selected bloque is not the open one. */
  disabled?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  /** Edited stock inicial by product; seeded from the server on every open. */
  const [initials, setInitials] = useState<Record<string, number>>({});
  /** Products pulled in from the search that the list would not show by itself. */
  const [added, setAdded] = useState<string[]>([]);
  /** Raw text of the field being typed in, plus what it held when editing began. */
  const [typing, setTyping] = useState<
    Record<string, { raw: string; base: number }>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const byId = useMemo(
    () => new Map(stock.map((s) => [s.productId, s])),
    [stock],
  );

  /**
   * The rows to show: everything the bloque knows about whose initial or current
   * is above zero, plus anything explicitly added. A product with no activity at
   * all is absent from `stock`, so its produced and demand are zero.
   *
   * Order is entry order, not alphabetical: the server's rows come back in the
   * order they were entered (the save writes them in display order, so it holds
   * across sessions) and just-added products append after them, holding that
   * position for the rest of the session however their initial is edited.
   *
   * One case does not survive a reload in place: a row shown only because its
   * current is above zero — produced, never given an initial — is not persisted,
   * since the save carries initials only. The next read returns it after the
   * existence rows rather than where it sat here.
   */
  const rows: Row[] = useMemo(() => {
    const ids = new Set<string>();
    const addedIds = new Set(added);
    for (const s of stock) {
      // A product pulled in from the search is placed by the loop below, not
      // here. Letting it qualify on the edited initial would re-rank it
      // mid-keystroke: the first digit that makes it pass would have the Set
      // take it at its server position, ahead of everything added before it —
      // and the save, which writes display order, would persist that.
      if (addedIds.has(s.productId)) continue;
      const initial = initials[s.productId] ?? s.initial;
      if (initial > 0 || initial + s.produced - s.demand !== 0) {
        ids.add(s.productId);
      }
    }
    for (const id of added) ids.add(id);
    return [...ids].map((productId) => {
      const s = byId.get(productId);
      const name =
        s?.name ?? products.find((p) => p.id === productId)?.name ?? productId;
      const initial = initials[productId] ?? s?.initial ?? 0;
      const produced = s?.produced ?? 0;
      const demand = s?.demand ?? 0;
      return {
        productId,
        name,
        initial,
        produced,
        demand,
        current: initial + produced - demand,
      };
    });
  }, [stock, initials, added, byId, products]);

  function startEditing() {
    setInitials({});
    setAdded([]);
    setTyping({});
    setError(null);
    setEditing(true);
  }

  async function save() {
    setError(null);
    // Replace-all over the stock inicial. Every row is sent so clearing one to
    // zero actually clears it; zeros are dropped server-side.
    const items = rows
      .filter((r) => r.initial > 0)
      .map((r) => ({ productId: r.productId, quantity: r.initial }));
    try {
      await setSlotExistence(slotId, items);
      setEditing(false);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'No se pudo guardar el stock.',
      );
    }
  }

  return (
    <>
      <button
        className="btn-toolbar-ghost"
        onClick={startEditing}
        disabled={pending || disabled}
      >
        Stock
      </button>
      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Stock del bloque"
        aboveBody={
          <p className="muted modal-above-hint">
            El stock actual es el inicial más la producción real menos los
            pedidos. Se recalcula solo; lo único que se edita es el inicial.
          </p>
        }
        footer={
          <>
            <button
              className="btn-modal-secondary"
              onClick={() => setEditing(false)}
              disabled={pending}
            >
              Cancelar
            </button>
            <button
              className="btn-modal-primary"
              onClick={() => void save()}
              disabled={pending}
            >
              Guardar stock
            </button>
          </>
        }
      >
        <div className="stock-list">
          <div className="stock-head" role="row">
            <span>Producto</span>
            <span className="col-right">Inicial</span>
            <span className="col-right">Actual</span>
          </div>
          {rows.length === 0 ? (
            <p className="muted items-empty">
              No hay stock registrado en este bloque. Buscá un producto abajo
              para cargarle un stock inicial.
            </p>
          ) : (
            <ul className="stock-rows">
              {rows.map((r) => (
                <li className="stock-row" key={r.productId}>
                  <span className="stock-name">{r.name}</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className="stock-initial"
                    aria-label={`Stock inicial de ${r.name}`}
                    value={typing[r.productId]?.raw ?? String(r.initial)}
                    disabled={pending}
                    onFocus={() =>
                      setTyping((t) => ({
                        ...t,
                        [r.productId]: {
                          raw: String(r.initial),
                          base: r.initial,
                        },
                      }))
                    }
                    onChange={(e) => {
                      const raw = e.target.value;
                      setTyping((t) => ({
                        ...t,
                        [r.productId]: {
                          raw,
                          base: t[r.productId]?.base ?? r.initial,
                        },
                      }));
                      const n = Math.floor(Number(raw));
                      if (raw !== '' && Number.isFinite(n) && n >= 0) {
                        setInitials((q) => ({ ...q, [r.productId]: n }));
                      }
                    }}
                    onBlur={() => {
                      // An emptied field falls back to what it held on focus, not
                      // to a digit it passed through on the way out.
                      const leaving = typing[r.productId];
                      const n = Math.floor(Number(leaving?.raw));
                      if (leaving && !(leaving.raw !== '' && n >= 0)) {
                        setInitials((q) => ({
                          ...q,
                          [r.productId]: leaving.base,
                        }));
                      }
                      setTyping(({ [r.productId]: _drop, ...rest }) => rest);
                    }}
                  />
                  <span
                    className={
                      r.current < 0
                        ? 'stock-current stock-current--short'
                        : 'stock-current'
                    }
                  >
                    {r.current}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="product-add-bar">
            <ProductCombobox
              id="stock-product"
              products={products}
              addedIds={rows.map((r) => r.productId)}
              onAdd={(productId) => {
                setAdded((a) => (a.includes(productId) ? a : [...a, productId]));
                setInitials((q) => ({
                  ...q,
                  [productId]: q[productId] ?? byId.get(productId)?.initial ?? 0,
                }));
              }}
              disabled={pending}
              dropUp
            />
          </div>
        </div>
        {error && <p className="error">{error}</p>}
      </Modal>
    </>
  );
}
