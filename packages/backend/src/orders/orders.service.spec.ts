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
  status: 'pending',
  expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1h ahead
  createdAt: new Date(),
  confirmedAt: null,
};

describe('OrdersService', () => {
  let prisma: PrismaMock;
  let slots: { getOpenSlotId: jest.Mock; resolveSlot: jest.Mock };
  let clients: { assertActive: jest.Mock };
  let service: OrdersService;

  beforeEach(() => {
    prisma = makePrisma();
    slots = {
      getOpenSlotId: jest.fn().mockResolvedValue('slot_open'),
      resolveSlot: jest.fn().mockResolvedValue(openSlot),
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
    it('records items and transitions a valid order to issued', async () => {
      prisma.order.findUnique.mockResolvedValue({ ...pendingOrder });
      prisma.product.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);

      await service.confirm('tok_valid', [
        { productId: 'p1', quantity: 2 },
        { productId: 'p2', quantity: 1 },
      ]);

      expect(prisma.orderItem.createMany).toHaveBeenCalledTimes(1);
      const updateArg = prisma.order.update.mock.calls[0][0];
      expect(updateArg.data.status).toBe('issued');
      expect(updateArg.data.confirmedAt).toBeInstanceOf(Date);
    });

    it('rejects an empty order and leaves it pending', async () => {
      prisma.order.findUnique.mockResolvedValue({ ...pendingOrder });

      await expect(service.confirm('tok_valid', [])).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('rejects an out-of-catalog item and leaves it pending', async () => {
      prisma.order.findUnique.mockResolvedValue({ ...pendingOrder });
      prisma.product.findMany.mockResolvedValue([{ id: 'p1' }]); // p9 missing

      await expect(
        service.confirm('tok_valid', [{ productId: 'p9', quantity: 1 }]),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('rejects a consumed (non-pending) token', async () => {
      prisma.order.findUnique.mockResolvedValue({
        ...pendingOrder,
        status: 'issued',
      });
      await expect(
        service.confirm('tok_valid', [{ productId: 'p1', quantity: 1 }]),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects an expired token', async () => {
      prisma.order.findUnique.mockResolvedValue({
        ...pendingOrder,
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(
        service.confirm('tok_valid', [{ productId: 'p1', quantity: 1 }]),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('denyForWhatsapp', () => {
    it('transitions a valid order to denied and records no items', async () => {
      prisma.order.findUnique.mockResolvedValue({ ...pendingOrder });

      await service.denyForWhatsapp('tok_valid');

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order_1' },
        data: { status: 'denied' },
      });
      expect(prisma.orderItem.createMany).not.toHaveBeenCalled();
    });

    it('rejects an expired/consumed token', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      await expect(
        service.denyForWhatsapp('nope'),
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

    it('returns invalid (no client/catalog) for an expired token', async () => {
      prisma.order.findUnique.mockResolvedValue({
        ...pendingOrder,
        expiresAt: new Date(Date.now() - 1000),
      });
      const res = await service.validateToken('tok_valid');
      expect(res).toEqual({ valid: false });
    });
  });

  describe('updateStatus', () => {
    it('marks an order finished and returns the updated id/status', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 'order_1' });
      prisma.order.update.mockResolvedValue({
        id: 'order_1',
        status: 'finished',
      });

      const res = await service.updateStatus('order_1', 'finished');

      expect(res).toEqual({ id: 'order_1', status: 'finished' });
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order_1' },
        data: { status: 'finished' },
        select: { id: true, status: true },
      });
    });

    it('allows a free-form transition (issued → pending)', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 'order_1' });
      prisma.order.update.mockResolvedValue({
        id: 'order_1',
        status: 'pending',
      });

      const res = await service.updateStatus('order_1', 'pending');

      expect(res.status).toBe('pending');
    });

    it('rejects an invalid status and leaves the order unchanged', async () => {
      await expect(
        service.updateStatus('order_1', 'shipped'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.order.findUnique).not.toHaveBeenCalled();
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('throws NotFound for a missing order', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('nope', 'finished'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.order.update).not.toHaveBeenCalled();
    });
  });

  describe('createOrder', () => {
    it('persists an order with items, defaulting status to issued', async () => {
      prisma.product.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
      prisma.order.create.mockResolvedValue({ id: 'order_new', status: 'issued' });

      const res = await service.createOrder({
        clientId: 'client_1',
        items: [
          { productId: 'p1', quantity: 2 },
          { productId: 'p2', quantity: 1 },
        ],
      });

      expect(res).toEqual({ id: 'order_new', status: 'issued' });
      const data = prisma.order.create.mock.calls[0][0].data;
      expect(data.clientId).toBe('client_1');
      expect(data.status).toBe('issued');
      expect(typeof data.token).toBe('string');
      expect(data.token.length).toBeGreaterThan(0);
      expect(data.expiresAt).toBeInstanceOf(Date);
      expect(data.items.create).toEqual([
        { productId: 'p1', quantity: 2 },
        { productId: 'p2', quantity: 1 },
      ]);
    });

    it('persists an order with no items', async () => {
      prisma.order.create.mockResolvedValue({ id: 'order_new', status: 'issued' });

      await service.createOrder({ clientId: 'client_1' });

      expect(prisma.product.findMany).not.toHaveBeenCalled();
      const data = prisma.order.create.mock.calls[0][0].data;
      expect(data.items).toBeUndefined();
    });

    it('persists a captured message', async () => {
      prisma.order.create.mockResolvedValue({ id: 'order_new', status: 'issued' });

      await service.createOrder({
        clientId: 'client_1',
        message: 'Hola, quiero 2 medialunas',
      });

      const data = prisma.order.create.mock.calls[0][0].data;
      expect(data.message).toBe('Hola, quiero 2 medialunas');
    });

    it('stores null when the message is absent or blank', async () => {
      prisma.order.create.mockResolvedValue({ id: 'order_new', status: 'issued' });

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
      prisma.order.create.mockResolvedValue({ id: 'order_new', status: 'issued' });

      await service.createOrder({ clientId: 'client_1' });
      await service.createOrder({ clientId: 'client_1' });

      const first = prisma.order.create.mock.calls[0][0].data.token;
      const second = prisma.order.create.mock.calls[1][0].data.token;
      expect(first).not.toBe(second);
    });
  });

  describe('replaceItems', () => {
    it('replaces the item list and leaves status untouched', async () => {
      prisma.order.findUnique
        .mockResolvedValueOnce({ id: 'order_1' })
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

    it('clears items when given an empty list', async () => {
      prisma.order.findUnique
        .mockResolvedValueOnce({ id: 'order_1' })
        .mockResolvedValueOnce({ id: 'order_1', items: [] });

      const res = await service.replaceItems('order_1', []);

      expect(prisma.orderItem.deleteMany).toHaveBeenCalledWith({
        where: { orderId: 'order_1' },
      });
      expect(prisma.orderItem.createMany).not.toHaveBeenCalled();
      expect(res.items).toEqual([]);
    });

    it('rejects an out-of-catalog item and leaves existing items unchanged', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 'order_1' });
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
      prisma.order.findUnique.mockResolvedValue({ id: 'order_1' });

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
          status: 'issued',
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
    // Builds an order with items shaped as the include returns (product nested).
    const orderWith = (
      status: string,
      items: { productId: string; name: string; quantity: number }[],
    ) => ({
      status,
      items: items.map((i, idx) => ({
        id: `oi_${status}_${idx}`,
        productId: i.productId,
        quantity: i.quantity,
        product: { id: i.productId, name: i.name },
      })),
    });

    it('sums the same product across orders and carries the product name', async () => {
      prisma.order.findMany.mockResolvedValue([
        orderWith('issued', [{ productId: 'p1', name: 'Croissant', quantity: 3 }]),
        orderWith('finished', [{ productId: 'p1', name: 'Croissant', quantity: 2 }]),
      ]);

      const res = await service.getProductionTotals('slot_7');

      expect(res.slot.id).toBe('slot_open');
      expect(res.items).toEqual([
        { productId: 'p1', name: 'Croissant', quantity: 5 },
      ]);
    });

    it('omits products with no demand (only ordered products appear)', async () => {
      prisma.order.findMany.mockResolvedValue([
        orderWith('issued', [{ productId: 'p1', name: 'Croissant', quantity: 1 }]),
      ]);

      const res = await service.getProductionTotals('2026-03-15');

      expect(res.items.map((i) => i.productId)).toEqual(['p1']);
    });

    it('sorts entries by product name', async () => {
      prisma.order.findMany.mockResolvedValue([
        orderWith('issued', [
          { productId: 'p2', name: 'Baguette', quantity: 1 },
          { productId: 'p1', name: 'Croissant', quantity: 1 },
        ]),
      ]);

      const res = await service.getProductionTotals('2026-03-15');

      expect(res.items.map((i) => i.name)).toEqual(['Baguette', 'Croissant']);
    });

    it('queries only production-relevant statuses (excludes denied/ignored)', async () => {
      prisma.order.findMany.mockResolvedValue([]);

      await service.getProductionTotals('2026-03-15');

      const where = prisma.order.findMany.mock.calls[0][0].where;
      expect(where.status).toEqual({
        in: ['pending', 'issued', 'finished'],
      });
      expect(where.status.in).not.toContain('denied');
      expect(where.status.in).not.toContain('ignored');
    });

    it('filters to the requested bloque', async () => {
      const requested = { ...openSlot, id: 'slot_7', seq: 7, status: 'closed' as const };
      slots.resolveSlot.mockResolvedValue(requested);
      prisma.order.findMany.mockResolvedValue([]);

      const res = await service.getProductionTotals('slot_7');

      expect(slots.resolveSlot).toHaveBeenCalledWith('slot_7');
      expect(res.slot.id).toBe('slot_7');
      const where = prisma.order.findMany.mock.calls[0][0].where;
      expect(where.slotId).toBe('slot_7');
    });

    it('defaults to the open bloque when no slotId is given', async () => {
      prisma.order.findMany.mockResolvedValue([]);

      const res = await service.getProductionTotals();

      expect(slots.resolveSlot).toHaveBeenCalledWith(undefined);
      expect(res.slot.id).toBe('slot_open');
      const where = prisma.order.findMany.mock.calls[0][0].where;
      expect(where.slotId).toBe('slot_open');
    });
  });
});
