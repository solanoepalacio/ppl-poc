import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  isOrderStatus,
  PRODUCTION_STATUSES,
  type ConfirmOrderItem,
  type CreateOrderRequest,
  type CreateOrderResponse,
  type DayViewResponse,
  type DeleteOrderResponse,
  type OrderStatus,
  type Product,
  type ProductionTotalsResponse,
  type ReplaceOrderItemsResponse,
  type TokenValidationResponse,
} from '@pannico/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { normalizePhoneE164 } from '../common/phone.util';
import { generateToken } from '../common/token.util';
import { computeExpiry } from '../config/token.config';
import { TokenService } from './token.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  /** Active catalog products, used by the form and the `/products` endpoint. */
  async getCatalog(): Promise<Product[]> {
    return this.prisma.product.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Validates a token for the customer form. When valid, returns the bound
   * phone and the catalog so the form can render; when invalid/expired/consumed,
   * returns `{ valid: false }` and resolves no phone or catalog.
   */
  async validateToken(token: string): Promise<TokenValidationResponse> {
    const order = await this.tokenService.findOrderByToken(token);
    if (!this.tokenService.isValid(order)) {
      return { valid: false };
    }
    return {
      valid: true,
      phone: order!.phone,
      catalog: await this.getCatalog(),
    };
  }

  /**
   * Confirms an order: validates items against the catalog, records them, and
   * transitions the order to `issued`. Rejects empty orders and out-of-catalog
   * items, leaving the order `pending`. Rejects invalid/expired/consumed tokens.
   */
  async confirm(token: string, items: ConfirmOrderItem[]): Promise<void> {
    const order = await this.tokenService.resolveValidOrder(token);
    if (!order) {
      throw new NotFoundException('Invalid, expired, or already-used link.');
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('An order must contain at least one item.');
    }
    await this.validateItemsAgainstCatalog(items);

    // Record items and flip to `issued` atomically.
    await this.prisma.$transaction([
      this.prisma.orderItem.createMany({
        data: items.map((i) => ({
          orderId: order.id,
          productId: i.productId,
          quantity: i.quantity,
        })),
      }),
      this.prisma.order.update({
        where: { id: order.id },
        data: { status: 'issued', confirmedAt: new Date() },
      }),
    ]);
  }

  /**
   * Records the customer's WhatsApp fallback: transitions the order to `denied`
   * and records no items. Rejects invalid/expired/consumed tokens.
   */
  async denyForWhatsapp(token: string): Promise<void> {
    const order = await this.tokenService.resolveValidOrder(token);
    if (!order) {
      throw new NotFoundException('Invalid, expired, or already-used link.');
    }
    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: 'denied' },
    });
  }

  /**
   * Back-office manual status update: sets an order's status to any valid
   * status, regardless of its current value (transitions are free-form). Only
   * `status` is touched — `confirmedAt` and items are left untouched. Rejects
   * an unknown status (400) and a missing order (404), leaving it unchanged.
   */
  async updateStatus(
    orderId: string,
    status: string,
  ): Promise<{ id: string; status: OrderStatus }> {
    if (!isOrderStatus(status)) {
      throw new BadRequestException(`Invalid order status: ${status}`);
    }
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true },
    });
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found.`);
    }
    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status },
      select: { id: true, status: true },
    });
    return { id: updated.id, status: updated.status as OrderStatus };
  }

  /**
   * Back-office manual order creation: records an order received off-channel
   * (phone/WhatsApp/in-person) directly, without generating a customer link.
   * Validates the phone and items against the catalog, generates an unused
   * token + expiry to satisfy the schema, and defaults the status to `issued`
   * since the order is already real. Rejects a bad phone, an unknown status,
   * or an out-of-catalog item, persisting nothing on rejection.
   */
  async createOrder(input: CreateOrderRequest): Promise<CreateOrderResponse> {
    const phone = normalizePhoneE164(input.phone);
    if (!phone) {
      throw new BadRequestException(
        'A valid phone number (E.164, e.g. +5491122334455) is required.',
      );
    }

    const status = input.status ?? 'issued';
    if (!isOrderStatus(status)) {
      throw new BadRequestException(`Invalid order status: ${status}`);
    }

    const items = input.items ?? [];
    await this.validateItemsAgainstCatalog(items);

    const message = input.message?.trim() || null;

    const order = await this.prisma.order.create({
      data: {
        phone,
        token: generateToken(),
        status,
        expiresAt: computeExpiry(),
        message,
        items:
          items.length > 0
            ? {
                create: items.map((i) => ({
                  productId: i.productId,
                  quantity: i.quantity,
                })),
              }
            : undefined,
      },
      select: { id: true, status: true },
    });
    return { id: order.id, status: order.status as OrderStatus };
  }

  /**
   * Back-office item edit: replaces an order's entire item list with the
   * submitted one, regardless of the order's status. An empty list clears the
   * items. Validates every item against the catalog (rejecting and leaving the
   * existing items untouched on failure) and never changes `status`. Rejects a
   * missing order (404).
   */
  async replaceItems(
    orderId: string,
    items: ConfirmOrderItem[],
  ): Promise<ReplaceOrderItemsResponse> {
    const exists = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException(`Order ${orderId} not found.`);
    }
    await this.validateItemsAgainstCatalog(items);

    // Replace the whole list atomically: drop the old rows, write the new ones.
    const ops: Prisma.PrismaPromise<unknown>[] = [
      this.prisma.orderItem.deleteMany({ where: { orderId } }),
    ];
    if (items.length > 0) {
      ops.push(
        this.prisma.orderItem.createMany({
          data: items.map((i) => ({
            orderId,
            productId: i.productId,
            quantity: i.quantity,
          })),
        }),
      );
    }
    await this.prisma.$transaction(ops);

    const updated = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    return { id: orderId, items: updated!.items };
  }

  /**
   * Back-office order deletion: removes the order and (via cascade) its items.
   * Intended for corrections such as duplicates; cancellations that should
   * still count use a status change instead. Rejects a missing order (404).
   */
  async deleteOrder(orderId: string): Promise<DeleteOrderResponse> {
    const exists = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException(`Order ${orderId} not found.`);
    }
    await this.prisma.order.delete({ where: { id: orderId } });
    return { id: orderId };
  }

  /**
   * Validates that every item references an active catalog product with a
   * positive integer quantity, throwing `BadRequestException` otherwise. Does
   * not enforce a non-empty list — callers that require items check that
   * themselves. Shared by `confirm`, `createOrder`, and `replaceItems` so the
   * catalog check can never drift between them.
   */
  private async validateItemsAgainstCatalog(
    items: ConfirmOrderItem[],
  ): Promise<void> {
    if (items.length === 0) {
      return;
    }
    const productIds = [...new Set(items.map((i) => i.productId))];
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
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        throw new BadRequestException(
          'Item quantities must be positive integers.',
        );
      }
    }
  }

  /**
   * Returns orders created on `day` (YYYY-MM-DD, server-local), defaulting to
   * today, each with its status, items, and phone number for the back office.
   */
  async getOrdersByDay(day?: string): Promise<DayViewResponse> {
    const { start, end, label } = dayBounds(day);
    const orders = await this.prisma.order.findMany({
      where: { createdAt: { gte: start, lt: end } },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
    return {
      day: label,
      orders: orders.map((o) => ({
        id: o.id,
        phone: o.phone,
        status: o.status as DayViewResponse['orders'][number]['status'],
        createdAt: o.createdAt.toISOString(),
        items: o.items,
      })),
    };
  }

  /**
   * Per-item production totals for `day` (YYYY-MM-DD, server-local), defaulting
   * to today: the summed quantity of each product across orders that represent
   * real demand (`PRODUCTION_STATUSES`). Returns one entry per product with a
   * positive total, sorted by product name; products with no demand are omitted.
   */
  async getProductionTotals(day?: string): Promise<ProductionTotalsResponse> {
    const { start, end, label } = dayBounds(day);
    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: start, lt: end },
        status: { in: PRODUCTION_STATUSES as string[] },
      },
      include: { items: { include: { product: true } } },
    });

    // Sum quantities per product, carrying the product name for display.
    const totals = new Map<string, { name: string; quantity: number }>();
    for (const order of orders) {
      for (const item of order.items) {
        const entry = totals.get(item.productId);
        if (entry) {
          entry.quantity += item.quantity;
        } else {
          totals.set(item.productId, {
            name: item.product.name,
            quantity: item.quantity,
          });
        }
      }
    }

    const items = [...totals.entries()]
      .map(([productId, { name, quantity }]) => ({ productId, name, quantity }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { day: label, items };
  }
}

/** Computes [start, end) bounds for a YYYY-MM-DD day in server-local time. */
function dayBounds(day?: string): { start: Date; end: Date; label: string } {
  let year: number;
  let month: number;
  let date: number;
  if (day && /^\d{4}-\d{2}-\d{2}$/.test(day)) {
    const [y, m, d] = day.split('-').map(Number);
    year = y;
    month = m;
    date = d;
  } else {
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth() + 1;
    date = now.getDate();
  }
  const start = new Date(year, month - 1, date, 0, 0, 0, 0);
  const end = new Date(year, month - 1, date + 1, 0, 0, 0, 0);
  const label = `${year}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
  return { start, end, label };
}
