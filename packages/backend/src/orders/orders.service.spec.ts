import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { TokenService } from './token.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { SlotsService } from '../slots/slots.service';
import type { ClientsService } from '../clients/clients.service';

/** The open bloque resolveSlot returns by default in these unit tests. */
const openSlot = {
  id: 'slot_open',
  seq: 2,
  status: 'open' as const,
  openedAt: new Date('2026-03-15T00:00:00.000Z'),
  closedAt: null,
};

type PrismaMock = {
  order: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
  };
  product: { findMany: jest.Mock };
  client: { findUnique: jest.Mock };
  orderItem: { createMany: jest.Mock; deleteMany: jest.Mock };
  $transaction: jest.Mock;
};

function makePrisma(): PrismaMock {
  return {
    order: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
      create: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
    },
    product: { findMany: jest.fn() },
    client: { findUnique: jest.fn() },
    orderItem: {
      createMany: jest.fn().mockResolvedValue(undefined),
      deleteMany: jest.fn().mockResolvedValue(undefined),
    },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };
}

const pendingOrder = {
  id: 'order_1',
  clientId: 'client_1',
  token: 'tok_valid',
  slotId: 'slot_open',
  slot: { status: 'open' }, // joined bloque — token is valid while it is open
  createdAt: new Date(),
  confirmedAt: null,
  consumedAt: null, // unconsumed — the single-use gate is open
};

describe('OrdersService', () => {
  let prisma: PrismaMock;
  let slots: {
    getOpenSlotId: jest.Mock;
    resolveSlot: jest.Mock;
    getExistenceMap: jest.Mock;
    getProducedMap: jest.Mock;
    getDemandMap: jest.Mock;
  };
  let clients: { assertActive: jest.Mock };
  let service: OrdersService;

  beforeEach(() => {
    prisma = makePrisma();
    slots = {
      getOpenSlotId: jest.fn().mockResolvedValue('slot_open'),
      resolveSlot: jest.fn().mockResolvedValue(openSlot),
      getExistenceMap: jest.fn().mockResolvedValue(new Map<string, number>()),
      getProducedMap: jest.fn().mockResolvedValue(new Map<string, number>()),
      getDemandMap: jest
        .fn()
        .mockResolvedValue(new Map<string, { name: string; quantity: number }>()),
    };
    clients = { assertActive: jest.fn().mockResolvedValue(undefined) };
    const tokenService = new TokenService(prisma as unknown as PrismaService);
    service = new OrdersService(
      prisma as unknown as PrismaService,
      tokenService,
      slots as unknown as SlotsService,
      clients as unknown as ClientsService,
    );
  });

  describe('confirm', () => {
    it('records items and consumes a valid order', async () => {
      prisma.order.findUnique.mockResolvedValue({ ...pendingOrder });
      prisma.product.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);

      await service.confirm('tok_valid', [
        { productId: 'p1', quantity: 2 },
        { productId: 'p2', quantity: 1 },
      ]);

      expect(prisma.orderItem.createMany).toHaveBeenCalledTimes(1);
      const updateArg = prisma.order.update.mock.calls[0][0];
      expect(updateArg.data.consumedAt).toBeInstanceOf(Date);
      expect(updateArg.data.confirmedAt).toBeInstanceOf(Date);
    });

    it('rejects an empty order and leaves the link usable', async () => {
      prisma.order.findUnique.mockResolvedValue({ ...pendingOrder });

      await expect(service.confirm('tok_valid', [])).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('rejects an out-of-catalog item and leaves the link usable', async () => {
      prisma.order.findUnique.mockResolvedValue({ ...pendingOrder });
      prisma.product.findMany.mockResolvedValue([{ id: 'p1' }]); // p9 missing

      await expect(
        service.confirm('tok_valid', [{ productId: 'p9', quantity: 1 }]),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('rejects an already-consumed token', async () => {
      prisma.order.findUnique.mockResolvedValue({
        ...pendingOrder,
        consumedAt: new Date(),
      });
      await expect(
        service.confirm('tok_valid', [{ productId: 'p1', quantity: 1 }]),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a token whose bloque is closed', async () => {
      prisma.order.findUnique.mockResolvedValue({
        ...pendingOrder,
        slot: { status: 'closed' },
      });
      await expect(
        service.confirm('tok_valid', [{ productId: 'p1', quantity: 1 }]),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('validateToken', () => {
    it('returns valid + client name + catalog for a pending unexpired token', async () => {
      prisma.order.findUnique.mockResolvedValue({ ...pendingOrder });
      prisma.client.findUnique.mockResolvedValue({ name: 'Il Postino' });
      prisma.product.findMany.mockResolvedValue([
        { id: 'p1', name: 'A', active: true },
      ]);

      const res = await service.validateToken('tok_valid');
      expect(res.valid).toBe(true);
      expect(res.clientName).toBe('Il Postino');
      expect(res.catalog).toHaveLength(1);
    });

    it('returns invalid (no client/catalog) for a token in a closed bloque', async () => {
      prisma.order.findUnique.mockResolvedValue({
        ...pendingOrder,
        slot: { status: 'closed' },
      });
      const res = await service.validateToken('tok_valid');
      expect(res).toEqual({ valid: false });
    });
  });

  describe('createOrder', () => {
    it('persists an order with items and returns its id', async () => {
      prisma.product.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
      prisma.order.create.mockResolvedValue({ id: 'order_new' });

      const res = await service.createOrder({
        clientId: 'client_1',
        items: [
          { productId: 'p1', quantity: 2 },
          { productId: 'p2', quantity: 1 },
        ],
      });

      expect(res).toEqual({ id: 'order_new' });
      const data = prisma.order.create.mock.calls[0][0].data;
      expect(data.clientId).toBe('client_1');
      expect(typeof data.token).toBe('string');
      expect(data.token.length).toBeGreaterThan(0);
      expect(data.items.create).toEqual([
        { productId: 'p1', quantity: 2 },
        { productId: 'p2', quantity: 1 },
      ]);
    });

    it('persists an order with no items', async () => {
      prisma.order.create.mockResolvedValue({ id: 'order_new' });

      await service.createOrder({ clientId: 'client_1' });

      expect(prisma.product.findMany).not.toHaveBeenCalled();
      const data = prisma.order.create.mock.calls[0][0].data;
      expect(data.items).toBeUndefined();
    });

    it('persists a captured message', async () => {
      prisma.order.create.mockResolvedValue({ id: 'order_new' });

      await service.createOrder({
        clientId: 'client_1',
        message: 'Hola, quiero 2 medialunas',
      });

      const data = prisma.order.create.mock.calls[0][0].data;
      expect(data.message).toBe('Hola, quiero 2 medialunas');
    });

    it('stores null when the message is absent or blank', async () => {
      prisma.order.create.mockResolvedValue({ id: 'order_new' });

      await service.createOrder({ clientId: 'client_1' });
      await service.createOrder({ clientId: 'client_1', message: '   ' });

      expect(prisma.order.create.mock.calls[0][0].data.message).toBeNull();
      expect(prisma.order.create.mock.calls[1][0].data.message).toBeNull();
    });

    it('rejects an out-of-catalog item and persists nothing', async () => {
      prisma.product.findMany.mockResolvedValue([]); // p9 missing

      await expect(
        service.createOrder({
          clientId: 'client_1',
          items: [{ productId: 'p9', quantity: 1 }],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('rejects a missing/inactive client and persists nothing', async () => {
      clients.assertActive.mockRejectedValue(new BadRequestException());

      await expect(
        service.createOrder({ clientId: 'nope' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('generates a fresh token per order', async () => {
      prisma.order.create.mockResolvedValue({ id: 'order_new' });

      await service.createOrder({ clientId: 'client_1' });
      await service.createOrder({ clientId: 'client_1' });

      const first = prisma.order.create.mock.calls[0][0].data.token;
      const second = prisma.order.create.mock.calls[1][0].data.token;
      expect(first).not.toBe(second);
    });
  });

  describe('replaceItems', () => {
    it('replaces the item list without touching the order row', async () => {
      prisma.order.findUnique
        .mockResolvedValueOnce({ id: 'order_1', slot: { status: 'open' } })
        .mockResolvedValueOnce({
          id: 'order_1',
          items: [{ id: 'oi_1', orderId: 'order_1', productId: 'p1', quantity: 4 }],
        });
      prisma.product.findMany.mockResolvedValue([{ id: 'p1' }]);

      const res = await service.replaceItems('order_1', [
        { productId: 'p1', quantity: 4 },
      ]);

      expect(prisma.orderItem.deleteMany).toHaveBeenCalledWith({
        where: { orderId: 'order_1' },
      });
      expect(prisma.orderItem.createMany).toHaveBeenCalledTimes(1);
      expect(prisma.order.update).not.toHaveBeenCalled();
      expect(res.id).toBe('order_1');
      expect(res.items).toHaveLength(1);
    });

    it('writes and re-reads the items in submitted order', async () => {
      prisma.order.findUnique
        .mockResolvedValueOnce({ id: 'order_1', slot: { status: 'open' } })
        .mockResolvedValueOnce({ id: 'order_1', items: [] });
      prisma.product.findMany.mockResolvedValue([{ id: 'p9' }, { id: 'p1' }]);

      await service.replaceItems('order_1', [
        { productId: 'p9', quantity: 2 },
        { productId: 'p1', quantity: 5 },
      ]);

      // The write preserves the submitted order (cuids are minted in creation
      // order, so id order is this order)…
      expect(prisma.orderItem.createMany).toHaveBeenCalledWith({
        data: [
          { orderId: 'order_1', productId: 'p9', quantity: 2 },
          { orderId: 'order_1', productId: 'p1', quantity: 5 },
        ],
      });
      // …and the re-read asks for it back by id rather than trusting the
      // engine's emission order.
      expect(prisma.order.findUnique).toHaveBeenLastCalledWith(
        expect.objectContaining({
          include: { items: { orderBy: { id: 'asc' } } },
        }),
      );
    });

    it('clears items when given an empty list', async () => {
      prisma.order.findUnique
        .mockResolvedValueOnce({ id: 'order_1', slot: { status: 'open' } })
        .mockResolvedValueOnce({ id: 'order_1', items: [] });

      const res = await service.replaceItems('order_1', []);

      expect(prisma.orderItem.deleteMany).toHaveBeenCalledWith({
        where: { orderId: 'order_1' },
      });
      expect(prisma.orderItem.createMany).not.toHaveBeenCalled();
      expect(res.items).toEqual([]);
    });

    it('rejects an edit to an order in a closed bloque', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order_1',
        slot: { status: 'closed' },
      });

      await expect(
        service.replaceItems('order_1', [{ productId: 'p1', quantity: 1 }]),
      ).rejects.toBeInstanceOf(BadRequestException);
      // The bloque's demand is baked into the stock its successor inherited, so
      // nothing may change after the close.
      expect(prisma.orderItem.deleteMany).not.toHaveBeenCalled();
      expect(prisma.orderItem.createMany).not.toHaveBeenCalled();
    });

    it('rejects an out-of-catalog item and leaves existing items unchanged', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order_1',
        slot: { status: 'open' },
      });
      prisma.product.findMany.mockResolvedValue([]); // p9 missing

      await expect(
        service.replaceItems('order_1', [{ productId: 'p9', quantity: 1 }]),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.orderItem.deleteMany).not.toHaveBeenCalled();
      expect(prisma.orderItem.createMany).not.toHaveBeenCalled();
    });

    it('throws NotFound for a missing order', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.replaceItems('nope', [{ productId: 'p1', quantity: 1 }]),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.orderItem.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('deleteOrder', () => {
    it('removes the order (items cascade) and returns its id', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order_1',
        slot: { status: 'open' },
      });

      const res = await service.deleteOrder('order_1');

      expect(res).toEqual({ id: 'order_1' });
      expect(prisma.order.delete).toHaveBeenCalledWith({
        where: { id: 'order_1' },
      });
    });

    it('throws NotFound for a missing order', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(service.deleteOrder('nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.order.delete).not.toHaveBeenCalled();
    });

    it('rejects deleting an order in a closed bloque', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order_1',
        slot: { status: 'closed' },
      });

      await expect(service.deleteOrder('order_1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.order.delete).not.toHaveBeenCalled();
    });
  });

  describe('getOrdersBySlot', () => {
    it('filters to the requested bloque and returns it in the response', async () => {
      const requested = { ...openSlot, id: 'slot_7', seq: 7, status: 'closed' as const };
      slots.resolveSlot.mockResolvedValue(requested);
      prisma.order.findMany.mockResolvedValue([]);

      const res = await service.getOrdersBySlot('slot_7');

      expect(slots.resolveSlot).toHaveBeenCalledWith('slot_7');
      expect(res.slot.id).toBe('slot_7');
      expect(res.slot.seq).toBe(7);
      const where = prisma.order.findMany.mock.calls[0][0].where;
      expect(where).toEqual({ slotId: 'slot_7' });
    });

    it('defaults to the open bloque when no slotId is given', async () => {
      prisma.order.findMany.mockResolvedValue([]);

      const res = await service.getOrdersBySlot();

      expect(slots.resolveSlot).toHaveBeenCalledWith(undefined);
      expect(res.slot.id).toBe('slot_open');
      const where = prisma.order.findMany.mock.calls[0][0].where;
      expect(where).toEqual({ slotId: 'slot_open' });
    });

    it('surfaces each order with its client id and name', async () => {
      prisma.order.findMany.mockResolvedValue([
        {
          id: 'order_1',
          clientId: 'client_1',
          client: { name: 'Il Postino' },
          createdAt: new Date('2026-03-15T10:00:00.000Z'),
          items: [],
        },
      ]);

      const res = await service.getOrdersBySlot();

      expect(res.orders[0]).toMatchObject({
        id: 'order_1',
        clientId: 'client_1',
        clientName: 'Il Postino',
      });
    });
  });

  describe('getProductionTotals', () => {
    // Demand is summed by SlotsService now, so these tests stub that rather than
    // the raw order rows. They still exercise everything this service is
    // responsible for — the two deductions, the floor at zero, the sort and the
    // category pass-through; the summing itself is covered in slots.service.spec.
    const orderWith = (
      items: {
        productId: string;
        name: string;
        quantity: number;
        category?: 'sweet' | 'salty';
      }[],
    ) => items.map((i) => ({ ...i, category: i.category ?? 'salty' }));

    /** Stubs getDemandMap over the given "orders", summing and honouring category. */
    const stubDemand = (
      orders: { productId: string; name: string; quantity: number; category: string }[][],
    ) => {
      slots.getDemandMap.mockImplementation((_slotId: string, category?: string) => {
        const demand = new Map<string, { name: string; quantity: number }>();
        for (const items of orders) {
          for (const i of items) {
            if (category && i.category !== category) continue;
            const cur = demand.get(i.productId);
            if (cur) cur.quantity += i.quantity;
            else demand.set(i.productId, { name: i.name, quantity: i.quantity });
          }
        }
        return Promise.resolve(demand);
      });
    };

    it('sums the same product across orders and carries the product name', async () => {
      stubDemand([
        orderWith([{ productId: 'p1', name: 'Croissant', quantity: 3 }]),
        orderWith([{ productId: 'p1', name: 'Croissant', quantity: 2 }]),
      ]);

      const res = await service.getProductionTotals('slot_7');

      expect(res.slot.id).toBe('slot_open');
      expect(res.items).toEqual([
        { productId: 'p1', name: 'Croissant', demand: 5, existence: 0, produced: 0, toProduce: 5 },
      ]);
    });

    it('reports demand, existencia, and the net to produce', async () => {
      stubDemand([
        orderWith([{ productId: 'p1', name: 'Croissant', quantity: 8 }]),
      ]);
      slots.getExistenceMap.mockResolvedValue(new Map([['p1', 3]]));

      const res = await service.getProductionTotals('slot_open');

      expect(slots.getExistenceMap).toHaveBeenCalledWith('slot_open');
      expect(res.items).toEqual([
        { productId: 'p1', name: 'Croissant', demand: 8, existence: 3, produced: 0, toProduce: 5 },
      ]);
    });

    it('keeps a covered product, flooring the net to produce at zero', async () => {
      stubDemand([
        orderWith([
          { productId: 'p1', name: 'Croissant', quantity: 8 },
          { productId: 'p2', name: 'Baguette', quantity: 4 },
        ]),
      ]);
      slots.getExistenceMap.mockResolvedValue(
        new Map([
          ['p1', 10],
          ['p2', 4],
        ]),
      );

      const res = await service.getProductionTotals('slot_open');

      expect(res.items).toEqual([
        { productId: 'p2', name: 'Baguette', demand: 4, existence: 4, produced: 0, toProduce: 0 },
        { productId: 'p1', name: 'Croissant', demand: 8, existence: 10, produced: 0, toProduce: 0 },
      ]);
    });

    it('reports producción real and subtracts it from the net to produce', async () => {
      stubDemand([
        orderWith([{ productId: 'p1', name: 'Croissant', quantity: 8 }]),
      ]);
      slots.getProducedMap.mockResolvedValue(new Map([['p1', 3]]));

      const res = await service.getProductionTotals('slot_open');

      expect(slots.getProducedMap).toHaveBeenCalledWith('slot_open');
      expect(res.items).toEqual([
        { productId: 'p1', name: 'Croissant', demand: 8, existence: 0, produced: 3, toProduce: 5 },
      ]);
    });

    it('subtracts existencia and producción real together', async () => {
      stubDemand([
        orderWith([{ productId: 'p1', name: 'Croissant', quantity: 10 }]),
      ]);
      slots.getExistenceMap.mockResolvedValue(new Map([['p1', 2]]));
      slots.getProducedMap.mockResolvedValue(new Map([['p1', 6]]));

      const res = await service.getProductionTotals('slot_open');

      expect(res.items).toEqual([
        { productId: 'p1', name: 'Croissant', demand: 10, existence: 2, produced: 6, toProduce: 2 },
      ]);
    });

    it('floors the net at zero when both deductions together exceed demand', async () => {
      stubDemand([
        orderWith([{ productId: 'p1', name: 'Croissant', quantity: 4 }]),
      ]);
      slots.getExistenceMap.mockResolvedValue(new Map([['p1', 3]]));
      slots.getProducedMap.mockResolvedValue(new Map([['p1', 5]]));

      const res = await service.getProductionTotals('slot_open');

      // Overproduction shows 0, never a negative surplus, and the product stays
      // on the list because it still has demand.
      expect(res.items).toEqual([
        { productId: 'p1', name: 'Croissant', demand: 4, existence: 3, produced: 5, toProduce: 0 },
      ]);
    });

    it('keeps a fully produced product at zero rather than dropping it', async () => {
      stubDemand([
        orderWith([{ productId: 'p1', name: 'Croissant', quantity: 12 }]),
      ]);
      slots.getProducedMap.mockResolvedValue(new Map([['p1', 12]]));

      const res = await service.getProductionTotals('slot_open');

      expect(res.items).toEqual([
        { productId: 'p1', name: 'Croissant', demand: 12, existence: 0, produced: 12, toProduce: 0 },
      ]);
    });

    it('omits products with no demand (only ordered products appear)', async () => {
      stubDemand([
        orderWith([{ productId: 'p1', name: 'Croissant', quantity: 1 }]),
      ]);

      const res = await service.getProductionTotals('2026-03-15');

      expect(res.items.map((i) => i.productId)).toEqual(['p1']);
    });

    it('sorts entries by product name', async () => {
      stubDemand([
        orderWith([
          { productId: 'p2', name: 'Baguette', quantity: 1 },
          { productId: 'p1', name: 'Croissant', quantity: 1 },
        ]),
      ]);

      const res = await service.getProductionTotals('2026-03-15');

      expect(res.items.map((i) => i.name)).toEqual(['Baguette', 'Croissant']);
    });

    it('asks for the demand of the resolved bloque, unscoped by category', async () => {
      stubDemand([]);

      await service.getProductionTotals('2026-03-15');

      expect(slots.getDemandMap).toHaveBeenCalledWith('slot_open', undefined);
    });

    it('filters to the requested bloque', async () => {
      const requested = { ...openSlot, id: 'slot_7', seq: 7, status: 'closed' as const };
      slots.resolveSlot.mockResolvedValue(requested);
      stubDemand([]);

      const res = await service.getProductionTotals('slot_7');

      expect(slots.resolveSlot).toHaveBeenCalledWith('slot_7');
      expect(res.slot.id).toBe('slot_7');
      expect(slots.getDemandMap).toHaveBeenCalledWith('slot_7', undefined);
    });

    it('defaults to the open bloque when no slotId is given', async () => {
      stubDemand([]);

      const res = await service.getProductionTotals();

      expect(slots.resolveSlot).toHaveBeenCalledWith(undefined);
      expect(res.slot.id).toBe('slot_open');
      expect(slots.getDemandMap).toHaveBeenCalledWith('slot_open', undefined);
    });

    it('scopes totals to the requested category, excluding the other line', async () => {
      stubDemand([
        orderWith([
          { productId: 'p1', name: 'Ciabatta', quantity: 2, category: 'salty' },
          { productId: 'p2', name: 'Pavlova', quantity: 5, category: 'sweet' },
        ]),
      ]);

      const res = await service.getProductionTotals('slot_7', 'salty');

      expect(res.items).toEqual([
        { productId: 'p1', name: 'Ciabatta', demand: 2, existence: 0, produced: 0, toProduce: 2 },
      ]);
    });

    it('includes both categories when none is specified', async () => {
      stubDemand([
        orderWith([
          { productId: 'p1', name: 'Ciabatta', quantity: 2, category: 'salty' },
          { productId: 'p2', name: 'Pavlova', quantity: 5, category: 'sweet' },
        ]),
      ]);

      const res = await service.getProductionTotals('slot_7');

      expect(res.items.map((i) => i.productId).sort()).toEqual(['p1', 'p2']);
    });
  });
});
