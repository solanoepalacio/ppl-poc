import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import type {
  CloseSlotResponse,
  ExistenceItem,
  Slot as SlotDto,
  SlotExistenceResponse,
  SlotListItem,
  SlotListResponse,
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
