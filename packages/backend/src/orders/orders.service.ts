import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  type ConfirmOrderItem,
  type CreateOrderRequest,
  type CreateOrderResponse,
  type DeleteOrderResponse,
  type Product,
  type ProductCategory,
  type ProductionTotalsResponse,
  type ReplaceOrderItemsResponse,
  type SlotOrdersResponse,
  type TokenValidationResponse,
} from '@pannico/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SlotsService, toSlotDto } from '../slots/slots.service';
import { ClientsService } from '../clients/clients.service';
import { generateToken } from '../common/token.util';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { TokenService } from './token.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger('Orders');

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly slotsService: SlotsService,
    private readonly clientsService: ClientsService,
    private readonly whatsapp: WhatsappService,
  ) {}

  /** Active catalog products, used by the form and the `/products` endpoint. */
  async getCatalog(): Promise<Product[]> {
    const products = await this.prisma.product.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
    // `category` is a plain string column; narrow it to the union at the boundary
    // (mirroring how Slot.status is cast in toSlotDto).
    return products.map((p) => ({
      ...p,
      category: p.category as Product['category'],
    }));
  }

  /**
   * Validates a token for the customer form. When valid, returns the bound
   * client name and the catalog so the form can render; otherwise resolves
   * neither, and says which kind of unusable the link is.
   *
   * A spent link is reported as `confirmed` rather than `invalid`, which is what
   * lets the page a customer reloads after ordering show them their order went
   * through instead of telling them the link is dead. Keyed on `confirmedAt`
   * and not `consumedAt`: consuming is what closes the single-use gate, and
   * confirming is the thing the customer actually did.
   */
  async validateToken(token: string): Promise<TokenValidationResponse> {
    const order = await this.tokenService.findOrderByToken(token);
    if (!this.tokenService.isValid(order)) {
      return { state: order?.confirmedAt ? 'confirmed' : 'invalid' };
    }
    const client = await this.prisma.client.findUnique({
      where: { id: order!.clientId },
      select: { name: true },
    });
    return {
      state: 'valid',
      clientName: client?.name,
      catalog: await this.getCatalog(),
    };
  }

  /**
   * Confirms an order: validates items against the catalog, records them, and
   * consumes the link. Rejects empty orders and out-of-catalog items, leaving
   * the link unconsumed. Rejects invalid/closed-bloque/already-used tokens.
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

    // Record items and consume the link atomically. `confirmedAt` marks the
    // customer confirmation; `consumedAt` closes the single-use gate.
    const now = new Date();
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
        data: { consumedAt: now, confirmedAt: now },
      }),
    ]);

    // After the commit, and deliberately not awaited. The order is already
    // recorded; the recap goes to the chat rather than to the page, so the
    // customer's tap has no reason to wait on Meta's API. A failed send leaves
    // the order confirmed regardless, which is why the rejection is logged here
    // rather than propagated.
    void this.whatsapp.sendOrderConfirmation(order.id).catch((e: unknown) => {
      this.logger.error(
        `Order ${order.id} confirmed, but its WhatsApp recap failed: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    });
  }

  /**
   * Back-office manual order creation: records an order received off-channel
   * (WhatsApp/in-person) directly, without generating a customer link.
   * Validates the client and items against the catalog and generates an unused
   * token to satisfy the schema. Rejects a missing/inactive client or an
   * out-of-catalog item, persisting nothing on rejection.
   */
  async createOrder(input: CreateOrderRequest): Promise<CreateOrderResponse> {
    await this.clientsService.assertActive(input.clientId);

    const items = input.items ?? [];
    await this.validateItemsAgainstCatalog(items);

    const message = input.message?.trim() || null;
    const slotId = await this.slotsService.getOpenSlotId();

    const order = await this.prisma.order.create({
      data: {
        clientId: input.clientId,
        token: generateToken(),
        slotId,
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
      select: { id: true },
    });
    return { id: order.id };
  }

  /**
   * Back-office item edit: replaces an order's entire item list with the
   * submitted one. An empty list clears the items. Validates every item against
   * the catalog, rejecting and leaving the existing items untouched on failure.
   * Rejects a missing order (404) and one in a closed bloque (400) — see
   * `assertOrderInOpenSlot`.
   */
  async replaceItems(
    orderId: string,
    items: ConfirmOrderItem[],
  ): Promise<ReplaceOrderItemsResponse> {
    await this.assertOrderInOpenSlot(orderId);
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
      // Items in stored (entry) order: cuids are time-ordered and the
      // replace writes them in payload order.
      include: { items: { orderBy: { id: 'asc' } } },
    });
    return { id: orderId, items: updated!.items };
  }

  /**
   * Back-office order deletion: removes the order and (via cascade) its items.
   * Intended for corrections such as duplicates, and the way to drop a mistaken
   * order from production totals. Rejects a missing order (404) and one in a
   * closed bloque (400) — see `assertOrderInOpenSlot`.
   */
  async deleteOrder(orderId: string): Promise<DeleteOrderResponse> {
    await this.assertOrderInOpenSlot(orderId);
    await this.prisma.order.delete({ where: { id: orderId } });
    return { id: orderId };
  }

  /**
   * Rejects a missing order (404) or one whose bloque is already closed (400).
   *
   * A closed bloque's demand was used to compute the stock inicial its successor
   * inherited, so letting that demand change afterwards would leave the two
   * disagreeing with nothing able to detect it. Corrections go forward, on the
   * new bloque's editable stock, not backward on the old bloque's orders.
   */
  private async assertOrderInOpenSlot(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, slot: { select: { status: true } } },
    });
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found.`);
    }
    if (order.slot.status !== 'open') {
      throw new BadRequestException(
        `Order ${orderId} belongs to a closed bloque and can no longer be changed.`,
      );
    }
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
   * Returns the orders in a bloque, defaulting to the currently open bloque when
   * no `slotId` is given, each with its items and client for the back office.
   * Also returns the resolved bloque for the header/picker.
   */
  async getOrdersBySlot(slotId?: string): Promise<SlotOrdersResponse> {
    const slot = await this.slotsService.resolveSlot(slotId);
    const orders = await this.prisma.order.findMany({
      where: { slotId: slot.id },
      orderBy: { createdAt: 'desc' },
      include: { items: { orderBy: { id: 'asc' } }, client: true },
    });
    return {
      slot: toSlotDto(slot),
      orders: orders.map((o) => ({
        id: o.id,
        clientId: o.clientId,
        clientName: o.client.name,
        createdAt: o.createdAt.toISOString(),
        items: o.items,
      })),
    };
  }

  /**
   * Per-item production totals for a bloque, defaulting to the currently open
   * bloque. For each product ordered in the bloque it reports the summed demand,
   * the bloque's manually-entered existencia (stock on hand), its manually-entered
   * producción real (units already baked), and the net still to produce
   * (`max(0, demand − existence − produced)` — zero when covered, never negative).
   * Returns one entry per product with demand, sorted by product name; only
   * products with no demand are absent. A mistaken order is excluded by deleting
   * it.
   *
   * When a `category` is given, only products on that production line contribute,
   * so the salados and dulces views each show just their line's totals.
   */
  async getProductionTotals(
    slotId?: string,
    category?: ProductCategory,
  ): Promise<ProductionTotalsResponse> {
    const slot = await this.slotsService.resolveSlot(slotId);
    // The demand sum lives in SlotsService because closing a bloque needs it too,
    // and SlotsService cannot reach back into this one without closing a module
    // cycle. Summing it in both places would be two implementations of the same
    // rule waiting to drift apart.
    const totals = await this.slotsService.getDemandMap(slot.id, category);

    // Report the bloque's two manually-entered deductions alongside demand —
    // existencia (stock already on hand) and producción real (units baked so far)
    // — and the net still to produce. Both are subtracted under a single floor at
    // zero: a product covered by them shows 0 to produce, never a negative
    // surplus, so surplus in one product is never charged against another. This
    // is what makes the figure a countdown of what is *missing* rather than a
    // static record of what was needed.
    //
    // The list is no longer the demand alone. A product with a threshold is one
    // the bakery wants on the shelf whether or not anybody ordered it, and the
    // product nobody ordered today is exactly the one that quietly runs out — a
    // list built only from orders can never mention it. So the entries are the
    // union of "ordered in this bloque" and "active, with a threshold", and only
    // a product with neither is absent.
    const [existence, produced, stocked] = await Promise.all([
      this.slotsService.getExistenceMap(slot.id),
      this.slotsService.getProducedMap(slot.id),
      this.prisma.product.findMany({
        // Active only: an inactive product is not to be baked, and its threshold
        // is a leftover rather than an instruction. One already ordered in the
        // bloque keeps its entry through the demand map below — that demand is
        // real and somebody is waiting for it.
        where: { active: true, threshold: { gt: 0 }, ...(category ? { category } : {}) },
        select: { id: true, name: true, threshold: true },
      }),
    ]);

    const thresholds = new Map(stocked.map((p) => [p.id, p.threshold]));
    const rows = new Map<string, { name: string; demand: number }>();
    for (const [productId, { name, quantity }] of totals) {
      rows.set(productId, { name, demand: quantity });
    }
    for (const p of stocked) {
      if (!rows.has(p.id)) rows.set(p.id, { name: p.name, demand: 0 });
    }

    const items = [...rows.entries()]
      .map(([productId, { name, demand }]) => {
        const inStock = existence.get(productId) ?? 0;
        const alreadyMade = produced.get(productId) ?? 0;
        const threshold = thresholds.get(productId) ?? 0;
        return {
          productId,
          name,
          demand,
          existence: inStock,
          produced: alreadyMade,
          // Threshold and demand add rather than compete: the units a customer
          // ordered leave the shelf, so covering the order and holding the
          // threshold are both work to be done. With a threshold of zero this is
          // the rule that was here before — which is why every existing test of
          // it still passes unchanged.
          toProduce: Math.max(0, threshold + demand - inStock - alreadyMade),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return { slot: toSlotDto(slot), items };
  }
}
