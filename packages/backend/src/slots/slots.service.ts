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
} from '@pannico/shared';
import { Prisma, type Slot } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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
      const closed = await tx.slot.update({
        where: { id },
        data: { status: 'closed', closedAt: new Date() },
      });
      const max = await tx.slot.aggregate({ _max: { seq: true } });
      const open = await tx.slot.create({
        data: { seq: (max._max.seq ?? 0) + 1, status: 'open' },
      });
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
   * product with no entries is absent rather than reported as zero.
   */
  async getProduced(slotId?: string): Promise<SlotProducedResponse> {
    const slot = await this.resolveSlot(slotId);
    const rows = await this.prisma.slotProduced.findMany({
      where: { slotId: slot.id },
      orderBy: { createdAt: 'asc' },
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
      items: [...byProduct.values()].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
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
