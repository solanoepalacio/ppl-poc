import { Injectable } from '@nestjs/common';
import type { Order, Slot } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** An order with its production bloque joined, as loaded for token checks. */
export type OrderWithSlot = Order & { slot: Slot };

/** Minimal shape needed to judge token validity. */
export type TokenValidatable = Pick<Order, 'status'> & {
  slot: Pick<Slot, 'status'>;
};

@Injectable()
export class TokenService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The single source of truth for token validity (single-use + slot-scoped):
   * a token is valid only while its order is still `pending` AND the production
   * bloque it belongs to is still `open`. There is no time-based expiry — a link
   * lives exactly as long as its bloque stays open. The slot check is kept
   * alongside the status check so validity holds even if the close-time flip to
   * `ignored` has not run yet. Every endpoint reuses this predicate so the check
   * can never drift between call sites.
   */
  isValid(order: TokenValidatable | null): boolean {
    if (!order) {
      return false;
    }
    return order.status === 'pending' && order.slot.status === 'open';
  }

  /**
   * Loads the order bound to a token (with its bloque joined for the validity
   * check), or `null` if no such token exists.
   */
  async findOrderByToken(token: string): Promise<OrderWithSlot | null> {
    return this.prisma.order.findUnique({
      where: { token },
      include: { slot: true },
    });
  }

  /**
   * Resolves a token to its order only when valid; otherwise returns `null`.
   * Used by endpoints that must act on a still-actionable order.
   */
  async resolveValidOrder(token: string): Promise<OrderWithSlot | null> {
    const order = await this.findOrderByToken(token);
    return this.isValid(order) ? order : null;
  }
}
