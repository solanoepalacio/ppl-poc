import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import type {
  CloseSlotResponse,
  ExistenceItem,
  ProducedProduct,
  SetProducedProduct,
  Slot as SlotDto,
  SlotExistenceResponse,
  SlotListItem,
  SlotListResponse,
  SlotProducedResponse,
  SlotStockItem,
  SlotStockResponse,
  CloseSlotPreviewResponse,
} from '@pannico/shared';
import { Prisma, type Slot } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * The Prisma surface these reads need, satisfied both by the service and by the
 * client handed to a `$transaction` callback — so the carry can read the same
 * figures the stock view does, from inside the closing transaction.
 */
type PrismaLike = Prisma.TransactionClient;

/**
 * Owns the production-bloque lifecycle. The core invariant — exactly one `open`
 * bloque at any time — is guaranteed by this service (bootstrap + transactional
 * close) and backstopped by a partial unique index in the migration.
 */
@Injectable()
export class SlotsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  /** On boot, make sure an open bloque exists (self-heals a DB without one). */
  async onModuleInit(): Promise<void> {
    await this.ensureOpenSlot();
  }

  /**
   * Guarantees at least one open bloque exists, creating one (seq = max+1) when
   * none does. A concurrent bootstrap that wins the race trips the partial unique
   * index (P2002); we swallow that since the invariant is already satisfied.
   */
  async ensureOpenSlot(): Promise<Slot> {
    const existing = await this.prisma.slot.findFirst({
      where: { status: 'open' },
    });
    if (existing) {
      return existing;
    }
    try {
      const max = await this.prisma.slot.aggregate({ _max: { seq: true } });
      return await this.prisma.slot.create({
        data: { seq: (max._max.seq ?? 0) + 1, status: 'open' },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        // Another caller opened one first — re-read and return it.
        const open = await this.prisma.slot.findFirst({
          where: { status: 'open' },
        });
        if (open) {
          return open;
        }
      }
      throw err;
    }
  }

  /** The current open bloque, creating one if somehow absent. */
  async getOpenSlot(): Promise<Slot> {
    return this.ensureOpenSlot();
  }

  /** Convenience for the order-creation paths that only need the id. */
  async getOpenSlotId(): Promise<string> {
    return (await this.getOpenSlot()).id;
  }

  /** The current open bloque as a serializable DTO (for the controller). */
  async getOpenSlotView(): Promise<SlotDto> {
    return toDto(await this.getOpenSlot());
  }

  /**
   * Resolves a bloque for a read view: the one with `slotId` when given (404 if
   * unknown), otherwise the current open bloque. Used by the orders/production
   * views to default to the open bloque.
   */
  async resolveSlot(slotId?: string): Promise<Slot> {
    if (!slotId) {
      return this.getOpenSlot();
    }
    const slot = await this.prisma.slot.findUnique({ where: { id: slotId } });
    if (!slot) {
      throw new NotFoundException(`Slot ${slotId} not found.`);
    }
    return slot;
  }

  /** All bloques for the management view, newest (highest seq) first. */
  async listSlots(): Promise<SlotListResponse> {
    const slots = await this.prisma.slot.findMany({
      orderBy: { seq: 'desc' },
      include: { _count: { select: { orders: true } } },
    });
    return {
      slots: slots.map(
        (s): SlotListItem => ({
          ...toDto(s),
          orderCount: s._count.orders,
        }),
      ),
    };
  }

  /**
   * Closes the given open bloque and atomically opens the next one, so there is
   * always exactly one open bloque. Rejects a missing (404) or already-closed
   * (400) bloque. The transaction plus the partial unique index make a
   * double-close race roll back cleanly.
   *
   * Closing a bloque is also the moment its unused order links die — but no
   * order state is written for that: a token is invalid once its bloque is
   * `closed`, so the closed status alone retires every unused link in it.
   *
   * Closing also **carries the stock forward**: each product's stock actual
   * becomes the successor's stock inicial, so a count continues across bloques
   * instead of restarting at zero. A stock actual of zero or below is not carried
   * — stock inicial is a counted quantity and never negative, so a shortfall is
   * discarded rather than becoming a debt the next bloque would bake without an
   * order asking for it. `getClosePreview` exists so the manager can see that
   * coming.
   *
   * The carry reads and writes inside the same transaction as the close, so a
   * bloque is never left closed without its successor having received the stock,
   * and a write landing mid-close cannot produce a carry matching neither bloque.
   */
  async closeSlot(id: string): Promise<CloseSlotResponse> {
    const { closed, open } = await this.prisma.$transaction(async (tx) => {
      const slot = await tx.slot.findUnique({ where: { id } });
      if (!slot) {
        throw new NotFoundException(`Slot ${id} not found.`);
      }
      if (slot.status !== 'open') {
        throw new BadRequestException(`Slot ${id} is already closed.`);
      }
      // Read the closing bloque's position before anything changes.
      const { all } = await this.stockOf(slot.id, tx);
      const closed = await tx.slot.update({
        where: { id },
        data: { status: 'closed', closedAt: new Date() },
      });
      const max = await tx.slot.aggregate({ _max: { seq: true } });
      const open = await tx.slot.create({
        data: { seq: (max._max.seq ?? 0) + 1, status: 'open' },
      });
      const carry = all.filter((r) => r.current > 0);
      if (carry.length > 0) {
        await tx.slotExistence.createMany({
          data: carry.map((r) => ({
            slotId: open.id,
            productId: r.productId,
            quantity: r.current,
          })),
        });
      }
      return { closed, open };
    });
    return { closed: toDto(closed), open: toDto(open) };
  }

  /**
   * The manually-entered existencia (stock on hand) for a bloque, defaulting to
   * the open one. Returns one entry per product with a recorded quantity; a
   * product with no row has zero existence.
   */
  async getExistence(slotId?: string): Promise<SlotExistenceResponse> {
    const slot = await this.resolveSlot(slotId);
    const rows = await this.prisma.slotExistence.findMany({
      where: { slotId: slot.id },
      // Same order `stockOf` reads this table in, so the two existencia reads
      // cannot disagree about the same bloque. Entry order is a contract now
      // (the stock dialog's order has to survive a save), and leaving one of the
      // two readers unordered is how they drift apart.
      orderBy: { id: 'asc' },
      select: { productId: true, quantity: true },
    });
    return {
      slot: toDto(slot),
      items: rows.map((r) => ({ productId: r.productId, quantity: r.quantity })),
    };
  }

  /**
   * The bloque's existencia as a productId → quantity map, for subtracting from
   * production totals. Consumed by the production-totals aggregation.
   */
  async getExistenceMap(slotId: string): Promise<Map<string, number>> {
    const rows = await this.prisma.slotExistence.findMany({
      where: { slotId },
      select: { productId: true, quantity: true },
    });
    return new Map(rows.map((r) => [r.productId, r.quantity]));
  }

  /**
   * Replaces a bloque's existencia with `items` (replace-all). Only the open
   * bloque is editable — closed bloques are history. Validates non-negative
   * integer quantities against the active catalog; zero-quantity entries clear a
   * product's existence rather than storing a zero row.
   */
  async setExistence(
    slotId: string,
    items: ExistenceItem[],
  ): Promise<SlotExistenceResponse> {
    const slot = await this.resolveSlot(slotId);
    if (slot.status !== 'open') {
      throw new BadRequestException(
        `Slot ${slot.id} is closed; existence can only be set on the open bloque.`,
      );
    }

    const productIds = [...new Set(items.map((i) => i.productId))];
    if (productIds.length > 0) {
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds }, active: true },
        select: { id: true },
      });
      const validIds = new Set(products.map((p) => p.id));
      for (const item of items) {
        if (!validIds.has(item.productId)) {
          throw new BadRequestException(
            `Product ${item.productId} is not in the catalog.`,
          );
        }
        if (!Number.isInteger(item.quantity) || item.quantity < 0) {
          throw new BadRequestException(
            'Existence quantities must be non-negative integers.',
          );
        }
      }
    }

    // Drop zeros and collapse duplicate productIds (last wins) before persisting.
    const positives = new Map<string, number>();
    for (const item of items) {
      if (item.quantity > 0) {
        positives.set(item.productId, item.quantity);
      } else {
        positives.delete(item.productId);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.slotExistence.deleteMany({ where: { slotId: slot.id } });
      if (positives.size > 0) {
        await tx.slotExistence.createMany({
          data: [...positives.entries()].map(([productId, quantity]) => ({
            slotId: slot.id,
            productId,
            quantity,
          })),
        });
      }
    });

    return {
      slot: toDto(slot),
      items: [...positives.entries()].map(([productId, quantity]) => ({
        productId,
        quantity,
      })),
    };
  }

  /**
   * The bloque's producción real grouped by product, defaulting to the open
   * bloque. Each product carries its entries (oldest first) and their sum; a
   * product with no entries is absent rather than reported as zero. Products are
   * ordered by their first entry — the list reads as a log of the bloque's
   * baking — which falls out of building the groups from rows read oldest-first.
   */
  async getProduced(slotId?: string): Promise<SlotProducedResponse> {
    const slot = await this.resolveSlot(slotId);
    const rows = await this.prisma.slotProduced.findMany({
      where: { slotId: slot.id },
      // One save writes several entries in the same millisecond; the id (cuid,
      // time-ordered) breaks the tie in creation order.
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      include: { product: { select: { name: true } } },
    });

    const byProduct = new Map<string, ProducedProduct>();
    for (const row of rows) {
      let entry = byProduct.get(row.productId);
      if (!entry) {
        entry = {
          productId: row.productId,
          name: row.product.name,
          total: 0,
          entries: [],
        };
        byProduct.set(row.productId, entry);
      }
      entry.total += row.quantity;
      entry.entries.push({
        id: row.id,
        quantity: row.quantity,
        createdAt: row.createdAt.toISOString(),
      });
    }

    return {
      slot: toDto(slot),
      items: [...byProduct.values()],
    };
  }

  /**
   * The bloque's producción real as a productId → summed quantity map, for
   * subtracting from production totals alongside the existencia. Sums the entries
   * rather than reading a stored total, since the entries are the source of truth.
   */
  async getProducedMap(slotId: string): Promise<Map<string, number>> {
    const rows = await this.prisma.slotProduced.groupBy({
      by: ['productId'],
      where: { slotId },
      _sum: { quantity: true },
    });
    return new Map(rows.map((r) => [r.productId, r._sum.quantity ?? 0]));
  }

  /**
   * The bloque's demand as a productId → `{ name, quantity }` map: the quantities
   * of each product summed across every order in the bloque, optionally narrowed
   * to one production line. There is no status filter — a mistaken order is
   * excluded by deleting it.
   *
   * This lives here rather than in OrdersService, where it is also consumed,
   * because closing a bloque needs it to compute what stock carries forward, and
   * SlotsService cannot depend on OrdersService without closing a module cycle
   * (OrdersModule already imports SlotsModule). Demand-per-bloque is in any case a
   * fact about a bloque, computed from the orders in it.
   */
  async getDemandMap(
    slotId: string,
    category?: string,
  ): Promise<Map<string, { name: string; quantity: number }>> {
    return this.demandMapWith(this.prisma, slotId, category);
  }

  /**
   * A bloque's stock position per product: the stock inicial, the producción real
   * summed over its batches, the demand, and the derived stock actual
   * (`initial + produced − demand`).
   *
   * The three sources disagree about which products they mention — production
   * omits products with no batch, existencia omits products with no row, demand
   * omits products with no order — so a product baked but never ordered nor
   * counted appears in exactly one of them. The union is done here, once, rather
   * than in a component.
   *
   * Reports every product with any activity, shortfalls included. The stock
   * control hides those itself: a manager adding a product in order to give it a
   * stock inicial needs its real demand and production, or the stock actual it
   * shows would be a fiction.
   */
  async getStock(slotId?: string): Promise<SlotStockResponse> {
    const slot = await this.resolveSlot(slotId);
    const { all } = await this.stockOf(slot.id);
    return { slot: toDto(slot), items: all };
  }

  /**
   * Every product's stock position in the bloque, unfiltered — the shared core
   * behind the stock view, the close preview and the carry, so the three can
   * never compute it differently. `tx` lets the carry read inside the closing
   * transaction.
   */
  private async stockOf(
    slotId: string,
    tx: PrismaLike = this.prisma,
  ): Promise<{ all: SlotStockItem[]; items: SlotStockItem[] }> {
    const [existenceRows, producedRows, demand] = await Promise.all([
      // Insertion order: cuid ids embed a timestamp+counter, so ascending id is
      // the order the rows were written — which is the order the manager entered
      // them, because the dialog submits in display order and the replace-all
      // save rewrites the rows in exactly that order.
      tx.slotExistence.findMany({
        where: { slotId },
        orderBy: { id: 'asc' },
        select: { productId: true, quantity: true, product: { select: { name: true } } },
      }),
      tx.slotProduced.groupBy({
        by: ['productId'],
        where: { slotId },
        _sum: { quantity: true },
        // The first entry's id orders produced-only products by first batch.
        _min: { id: true },
      }),
      this.demandMapWith(tx, slotId),
    ]);

    const rows = new Map<string, SlotStockItem>();
    const row = (productId: string, name: string): SlotStockItem => {
      let r = rows.get(productId);
      if (!r) {
        r = { productId, name, initial: 0, produced: 0, demand: 0, current: 0 };
        rows.set(productId, r);
      }
      return r;
    };
    // The map's insertion order is the response order: entered products first
    // (in entry order), then produced-only products by first batch, then
    // demand-only rows — hidden by the dialog — by name for determinism.
    for (const e of existenceRows) {
      row(e.productId, e.product.name).initial = e.quantity;
    }
    for (const p of [...producedRows].sort((a, b) =>
      (a._min?.id ?? '') < (b._min?.id ?? '') ? -1 : 1,
    )) {
      // A product may be produced without ever having existencia or a name yet
      // resolved here; the name is filled in by whichever source knows it.
      row(p.productId, '').produced = p._sum.quantity ?? 0;
    }
    for (const [productId, d] of [...demand.entries()].sort((a, b) =>
      a[1].name.localeCompare(b[1].name),
    )) {
      const r = row(productId, d.name);
      r.demand = d.quantity;
      if (!r.name) r.name = d.name;
    }

    // Any product still missing a name was known only to the produced history,
    // which does not join the product; fetch just those.
    const unnamed = [...rows.values()].filter((r) => !r.name).map((r) => r.productId);
    if (unnamed.length > 0) {
      const products = await tx.product.findMany({
        where: { id: { in: unnamed } },
        select: { id: true, name: true },
      });
      for (const p of products) {
        const r = rows.get(p.id);
        if (r) r.name = p.name;
      }
    }

    const all = [...rows.values()].map((r) => ({
      ...r,
      current: r.initial + r.produced - r.demand,
    }));
    return { all, items: all.filter((r) => r.initial > 0 || r.current > 0) };
  }

  /** `getDemandMap` against an explicit client, so the carry can read in-transaction. */
  private async demandMapWith(
    tx: PrismaLike,
    slotId: string,
    category?: string,
  ): Promise<Map<string, { name: string; quantity: number }>> {
    const rows = await tx.orderItem.findMany({
      where: {
        order: { slotId },
        ...(category ? { product: { category } } : {}),
      },
      select: { productId: true, quantity: true, product: { select: { name: true } } },
    });
    const demand = new Map<string, { name: string; quantity: number }>();
    for (const r of rows) {
      const entry = demand.get(r.productId);
      if (entry) entry.quantity += r.quantity;
      else demand.set(r.productId, { name: r.product.name, quantity: r.quantity });
    }
    return demand;
  }

  /**
   * The products of a bloque that would lose a shortfall if it were closed now.
   *
   * Advisory: closing clamps a negative stock actual to zero whether or not this
   * was called. It exists so the back office can say what is about to be dropped
   * instead of dropping it silently.
   */
  async getClosePreview(slotId?: string): Promise<CloseSlotPreviewResponse> {
    const slot = await this.resolveSlot(slotId);
    const { all } = await this.stockOf(slot.id);
    return {
      slot: toDto(slot),
      shortfalls: all
        .filter((r) => r.current < 0)
        .map((r) => ({
          productId: r.productId,
          name: r.name,
          shortfall: -r.current,
        })),
    };
  }

  /**
   * Replaces a bloque's producción real history with `items`.
   *
   * Replace-all over the entries **of the products named in `items`**: an entry
   * carrying an `id` is kept (its quantity updated, its `createdAt` preserved), an
   * entry without one is created and stamped now, and an existing entry of a named
   * product that was not sent is deleted. Sending a product with no entries
   * therefore clears its history — that is how "remove this product" is expressed.
   *
   * Products *not* named are left completely alone. That is deliberate: the dialog
   * sends its entire view on save, so a tab holding a stale read would otherwise
   * delete the history of anything added since it loaded, without the manager
   * touching a thing.
   *
   * Ids are checked against this bloque's own rows, and against the product they
   * are sent under, before anything is written.
   */
  async setProduced(
    slotId: string,
    items: SetProducedProduct[],
  ): Promise<SlotProducedResponse> {
    const slot = await this.resolveSlot(slotId);
    if (slot.status !== 'open') {
      throw new BadRequestException(
        `Slot ${slot.id} is closed; produced can only be set on the open bloque.`,
      );
    }

    const productIds = [...new Set(items.map((i) => i.productId))];
    if (productIds.length > 0) {
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds }, active: true },
        select: { id: true },
      });
      const validIds = new Set(products.map((p) => p.id));
      for (const productId of productIds) {
        if (!validIds.has(productId)) {
          throw new BadRequestException(
            `Product ${productId} is not in the catalog.`,
          );
        }
      }
    }

    // An entry of zero or less is not a batch; reject rather than silently drop,
    // since the manager's intent (delete it) has its own control.
    for (const item of items) {
      for (const entry of item.entries) {
        if (!Number.isInteger(entry.quantity) || entry.quantity <= 0) {
          throw new BadRequestException(
            'Produced quantities must be positive integers.',
          );
        }
      }
    }

    const existing = await this.prisma.slotProduced.findMany({
      where: { slotId: slot.id },
      select: { id: true, productId: true },
    });
    const ownerOf = new Map(existing.map((r) => [r.id, r.productId]));
    const keptIds = new Set<string>();
    for (const item of items) {
      for (const entry of item.entries) {
        if (entry.id === undefined) continue;
        // An id has to exist in this bloque *and* belong to the product it is
        // sent under, so an entry cannot be reassigned by mislabelling it.
        if (ownerOf.get(entry.id) !== item.productId) {
          throw new BadRequestException(
            `Entry ${entry.id} does not belong to product ${item.productId} in this bloque.`,
          );
        }
        if (keptIds.has(entry.id)) {
          throw new BadRequestException(`Entry ${entry.id} appears twice.`);
        }
        keptIds.add(entry.id);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      // Deletion is scoped to the products the client actually sent. A caller
      // working from a stale read would otherwise wipe the history of every
      // product it happened not to know about — and since the dialog sends its
      // whole view on save, merely opening a stale tab and pressing Guardar
      // would silently delete another session's entries. Sending a product with
      // no entries still clears it, which is how "remove this product" works, so
      // nothing is lost by narrowing the blast radius to what was named.
      const sent = new Set(items.map((i) => i.productId));
      const removed = existing
        .filter((r) => sent.has(r.productId) && !keptIds.has(r.id))
        .map((r) => r.id);
      if (removed.length > 0) {
        await tx.slotProduced.deleteMany({ where: { id: { in: removed } } });
      }
      for (const item of items) {
        for (const entry of item.entries) {
          if (entry.id === undefined) {
            await tx.slotProduced.create({
              data: {
                slotId: slot.id,
                productId: item.productId,
                quantity: entry.quantity,
              },
            });
          } else {
            await tx.slotProduced.update({
              where: { id: entry.id },
              data: { quantity: entry.quantity },
            });
          }
        }
      }
    });

    return this.getProduced(slot.id);
  }

}

/** Maps a Prisma Slot row to the shared DTO (dates → ISO strings). */
export function toSlotDto(slot: Slot): SlotDto {
  return toDto(slot);
}

function toDto(slot: Slot): SlotDto {
  return {
    id: slot.id,
    seq: slot.seq,
    status: slot.status as SlotDto['status'],
    openedAt: slot.openedAt.toISOString(),
    closedAt: slot.closedAt ? slot.closedAt.toISOString() : null,
  };
}
