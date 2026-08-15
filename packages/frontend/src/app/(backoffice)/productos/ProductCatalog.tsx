'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ManagedProduct, ProductCategory } from '@pannico/shared';
import { createProduct, deleteProduct, updateProduct } from '@/lib/api';

/** The row being edited, held apart from the server list until it is saved. */
type EditDraft = {
  name: string;
  category: ProductCategory;
  threshold: string;
  packSize: string;
};

const LINE: Record<ProductCategory, string> = {
  salty: 'Salados',
  sweet: 'Dulces',
};

/**
 * The product catalog and the controls that maintain it: an add form pinned at
 * the top, then every product — retired ones included — each editable in place.
 *
 * Built on the Clientes view rather than beside it, because it is the same
 * problem: a list orders point at, edited a field at a time, where removing an
 * entry must not take history with it. Editing happens **on the row** for the
 * same reason — fixing a name or a number is less ceremony than a dialog.
 *
 * The one thing that has no counterpart there is the **umbral**: the units to
 * hold on the shelf whatever was ordered. Zero is shown as "—" rather than a 0,
 * because there zero means "not set" — unlike the stock actual beside it, where
 * zero is a measurement and prints as a figure.
 *
 * The columns are headed, so no value repeats its own heading: the umbral cell
 * carries `100`, not `umbral 100`, and the orders cell `14`, not `14 pedidos`.
 */
export function ProductCatalog({
  products,
  stock,
}: {
  products: ManagedProduct[];
  /** Stock actual in the open bloque, by product. Absent means zero. */
  stock: Record<string, number>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<ProductCategory>('salty');
  const [newThreshold, setNewThreshold] = useState('');
  const [newPackSize, setNewPackSize] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditDraft>({
    name: '',
    category: 'salty',
    threshold: '',
    packSize: '',
  });
  /** Keyed by product, so one row's failure never appears on another. */
  const [rowError, setRowError] = useState<Record<string, string>>({});

  const locked = pending || busy;

  function refresh() {
    startTransition(() => router.refresh());
  }

  function fail(id: string | null, e: unknown, fallback: string) {
    const message = e instanceof Error ? e.message : fallback;
    if (id === null) setAddError(message);
    else setRowError((prev) => ({ ...prev, [id]: message }));
  }

  /** A blank figure means zero; anything unparseable is left to the server. */
  const parseCount = (raw: string) => (raw.trim() === '' ? 0 : Number(raw.trim()));

  async function add() {
    setAddError(null);
    setBusy(true);
    try {
      await createProduct({
        name: newName,
        category: newCategory,
        threshold: parseCount(newThreshold),
        packSize: parseCount(newPackSize),
      });
      setNewName('');
      setNewThreshold('');
      setNewPackSize('');
      refresh();
    } catch (e) {
      fail(null, e, 'No se pudo agregar el producto.');
    } finally {
      setBusy(false);
    }
  }

  function startEdit(product: ManagedProduct) {
    setEditingId(product.id);
    setDraft({
      name: product.name,
      category: product.category,
      threshold: product.threshold === 0 ? '' : String(product.threshold),
      packSize: product.packSize === 0 ? '' : String(product.packSize),
    });
    setRowError(({ [product.id]: _dropped, ...rest }) => rest);
  }

  async function saveEdit(id: string) {
    setBusy(true);
    try {
      await updateProduct(id, {
        name: draft.name,
        category: draft.category,
        threshold: parseCount(draft.threshold),
        packSize: parseCount(draft.packSize),
      });
      setEditingId(null);
      refresh();
    } catch (e) {
      fail(id, e, 'No se pudo guardar el producto.');
    } finally {
      setBusy(false);
    }
  }

  async function setActive(product: ManagedProduct, active: boolean) {
    setBusy(true);
    try {
      await updateProduct(product.id, { active });
      refresh();
    } catch (e) {
      fail(product.id, e, 'No se pudo cambiar el estado del producto.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(product: ManagedProduct) {
    const deletes = product.orderCount === 0;
    const question = deletes
      ? `¿Eliminar "${product.name}"? No está en ningún pedido y no se puede deshacer.`
      : `"${product.name}" está en ${product.orderCount} ${
          product.orderCount === 1 ? 'pedido' : 'pedidos'
        }, así que no se puede eliminar. ¿Desactivarlo? Deja de estar disponible para pedidos nuevos y los pedidos actuales no se tocan.`;
    if (!window.confirm(question)) return;

    setBusy(true);
    try {
      await deleteProduct(product.id);
      refresh();
    } catch (e) {
      fail(product.id, e, 'No se pudo eliminar el producto.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="client-add">
        <span className="modal-section-label">Agregar producto</span>
        <div className="product-add-row">
          <input
            type="text"
            className="client-input"
            aria-label="Nombre del producto"
            placeholder="Nombre"
            value={newName}
            disabled={locked}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newName.trim() !== '') void add();
            }}
          />
          <select
            className="product-select"
            aria-label="Línea de producción"
            value={newCategory}
            disabled={locked}
            onChange={(e) => setNewCategory(e.target.value as ProductCategory)}
          >
            <option value="salty">{LINE.salty}</option>
            <option value="sweet">{LINE.sweet}</option>
          </select>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            className="client-input product-threshold-input"
            aria-label="Umbral mínimo (opcional)"
            placeholder="Umbral"
            value={newThreshold}
            disabled={locked}
            onChange={(e) => setNewThreshold(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newName.trim() !== '') void add();
            }}
          />
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            className="client-input product-threshold-input"
            aria-label="Unidades por paquete (opcional)"
            placeholder="Paquete"
            value={newPackSize}
            disabled={locked}
            onChange={(e) => setNewPackSize(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newName.trim() !== '') void add();
            }}
          />
          <button
            type="button"
            className="btn-modal-primary"
            onClick={() => void add()}
            disabled={locked || newName.trim() === ''}
          >
            Agregar
          </button>
        </div>
        <p className="muted product-add-hint">
          El umbral es cuánto querés tener en góndola aunque nadie lo pida. El
          paquete es cuántas unidades trae, y es lo que habilita al cliente a
          pedirlo por paquete. En blanco o cero, ninguno de los dos se aplica.
        </p>
        {addError && <p className="error">{addError}</p>}
      </section>

      {products.length === 0 ? (
        <p className="muted items-empty">
          No hay productos todavía. Agregá el primero acá arriba.
        </p>
      ) : (
        <ul className="client-list product-list">
          {/* The same spans as a row, so the headings sit over the columns they
              name without a second layout to keep in step with the first. */}
          <li className="client-row product-row product-head" aria-hidden="true">
            <span className="client-name">Nombre</span>
            <span className="product-line">Categoría</span>
            <span className="product-threshold">Umbral</span>
            <span className="product-pack">Paquete</span>
            <span className="product-stock">Stock actual</span>
            <span className="client-orders">Pedidos</span>
            <span className="client-actions" />
          </li>
          {products.map((product) => {
            const editing = editingId === product.id;
            return (
              <li
                key={product.id}
                className={
                  product.active
                    ? 'client-row product-row'
                    : 'client-row product-row is-inactive'
                }
              >
                {editing ? (
                  <div className="product-edit">
                    <input
                      type="text"
                      className="client-input"
                      aria-label={`Nombre de ${product.name}`}
                      value={draft.name}
                      disabled={locked}
                      autoFocus
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, name: e.target.value }))
                      }
                    />
                    <select
                      className="product-select"
                      aria-label={`Línea de ${product.name}`}
                      value={draft.category}
                      disabled={locked}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          category: e.target.value as ProductCategory,
                        }))
                      }
                    >
                      <option value="salty">{LINE.salty}</option>
                      <option value="sweet">{LINE.sweet}</option>
                    </select>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      className="client-input product-threshold-input"
                      aria-label={`Umbral de ${product.name}`}
                      placeholder="Umbral"
                      value={draft.threshold}
                      disabled={locked}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, threshold: e.target.value }))
                      }
                    />
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      className="client-input product-threshold-input"
                      aria-label={`Unidades por paquete de ${product.name}`}
                      placeholder="Paquete"
                      value={draft.packSize}
                      disabled={locked}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, packSize: e.target.value }))
                      }
                    />
                    <button
                      type="button"
                      className="btn-modal-primary"
                      onClick={() => void saveEdit(product.id)}
                      disabled={locked || draft.name.trim() === ''}
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      className="btn-modal-secondary"
                      onClick={() => setEditingId(null)}
                      disabled={locked}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="client-name">
                      {product.name}
                      {/* Text, not just the muted styling: colour alone does not
                          carry the state. */}
                      {!product.active && (
                        <span className="client-tag">inactivo</span>
                      )}
                    </span>
                    <span className="product-line muted">
                      {LINE[product.category]}
                    </span>
                    <span className="product-threshold">
                      {product.threshold > 0 ? (
                        <strong>{product.threshold}</strong>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </span>
                    {/* Zero is an em dash here too: no pack is a state, not a
                        pack of none. */}
                    <span className="product-pack">
                      {product.packSize > 0 ? (
                        <strong>{product.packSize}</strong>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </span>
                    <span
                      className={
                        (stock[product.id] ?? 0) < 0
                          ? 'product-stock stock-current--short'
                          : 'product-stock'
                      }
                    >
                      {stock[product.id] ?? 0}
                    </span>
                    <span className="client-orders muted">
                      {product.orderCount}
                    </span>
                    <span className="client-actions">
                      <button
                        type="button"
                        className="btn-row-edit"
                        onClick={() => startEdit(product)}
                        disabled={locked}
                      >
                        Editar
                      </button>
                      {!product.active && (
                        <button
                          type="button"
                          className="btn-row-edit"
                          onClick={() => void setActive(product, true)}
                          disabled={locked}
                        >
                          Reactivar
                        </button>
                      )}
                      {/* A retired product that is on orders has nowhere left to
                          go — it cannot be deleted and it is already inactive —
                          so it gets no removal control at all. */}
                      {(product.active || product.orderCount === 0) && (
                        <button
                          type="button"
                          className="btn-row-delete"
                          onClick={() => void remove(product)}
                          disabled={locked}
                          title={
                            product.orderCount === 0
                              ? 'No está en ningún pedido: se elimina'
                              : 'Está en pedidos: se desactiva para conservarlos'
                          }
                        >
                          {product.orderCount === 0 ? 'Eliminar' : 'Desactivar'}
                        </button>
                      )}
                    </span>
                  </>
                )}
                {rowError[product.id] && (
                  <p className="error client-row-error">
                    {rowError[product.id]}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
