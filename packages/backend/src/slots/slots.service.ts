import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import type {
  CloseSlotResponse,
  Slot as SlotDto,
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
