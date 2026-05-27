import { Injectable } from '@nestjs/common';
import type { Order } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Minimal shape needed to judge token validity. */
export type TokenValidatable = Pick<Order, 'status' | 'expiresAt'>;

@Injectable()
export class TokenService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The single source of truth for token validity (single-use + expiry):
   * a token is valid only while its order is still `pending` AND `now` is
   * before the order's `expiresAt`. Every endpoint reuses this predicate so the
   * check can never drift between call sites.
   */
  isValid(order: TokenValidatable | null, now: Date = new Date()): boolean {
    if (!order) {
      return false;
    }
    return order.status === 'pending' && now < order.expiresAt;
  }

  /** Loads the order bound to a token, or `null` if no such token exists. */
  async findOrderByToken(token: string): Promise<Order | null> {
    return this.prisma.order.findUnique({ where: { token } });
  }

  /**
   * Resolves a token to its order only when valid; otherwise returns `null`.
   * Used by endpoints that must act on a still-actionable order.
   */
  async resolveValidOrder(
    token: string,
    now: Date = new Date(),
  ): Promise<Order | null> {
    const order = await this.findOrderByToken(token);
    return this.isValid(order, now) ? order : null;
  }
}
