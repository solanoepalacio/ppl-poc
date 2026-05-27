import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { TokenService } from './token.service';
import type { PrismaService } from '../prisma/prisma.service';

type PrismaMock = {
  order: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
  };
  product: { findMany: jest.Mock };
  orderItem: { createMany: jest.Mock };
  $transaction: jest.Mock;
};

function makePrisma(): PrismaMock {
  return {
    order: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    },
    product: { findMany: jest.fn() },
    orderItem: { createMany: jest.fn().mockResolvedValue(undefined) },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };
}

const pendingOrder = {
  id: 'order_1',
  phone: '+5491122334455',
  token: 'tok_valid',
  status: 'pending',
  expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1h ahead
  createdAt: new Date(),
  confirmedAt: null,
};

describe('OrdersService', () => {
  let prisma: PrismaMock;
  let service: OrdersService;

  beforeEach(() => {
    prisma = makePrisma();
    const tokenService = new TokenService(prisma as unknown as PrismaService);
    service = new OrdersService(
      prisma as unknown as PrismaService,
      tokenService,
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
    it('returns valid + catalog for a pending unexpired token', async () => {
      prisma.order.findUnique.mockResolvedValue({ ...pendingOrder });
      prisma.product.findMany.mockResolvedValue([
        { id: 'p1', name: 'A', active: true },
      ]);

      const res = await service.validateToken('tok_valid');
      expect(res.valid).toBe(true);
      expect(res.phone).toBe('+5491122334455');
      expect(res.catalog).toHaveLength(1);
    });

    it('returns invalid (no phone/catalog) for an expired token', async () => {
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

  describe('getOrdersByDay', () => {
    it('filters to the requested day [start, next-day)', async () => {
      prisma.order.findMany.mockResolvedValue([]);

      const res = await service.getOrdersByDay('2026-03-15');

      expect(res.day).toBe('2026-03-15');
      const where = prisma.order.findMany.mock.calls[0][0].where;
      expect(where.createdAt.gte).toEqual(new Date(2026, 2, 15, 0, 0, 0, 0));
      expect(where.createdAt.lt).toEqual(new Date(2026, 2, 16, 0, 0, 0, 0));
    });

    it('defaults to today when no day is given', async () => {
      prisma.order.findMany.mockResolvedValue([]);
      const now = new Date();

      const res = await service.getOrdersByDay();

      const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      expect(res.day).toBe(expected);
      const where = prisma.order.findMany.mock.calls[0][0].where;
      expect(where.createdAt.gte).toEqual(
        new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0),
      );
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

      const res = await service.getProductionTotals('2026-03-15');

      expect(res.day).toBe('2026-03-15');
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

    it('filters to the requested day [start, next-day)', async () => {
      prisma.order.findMany.mockResolvedValue([]);

      await service.getProductionTotals('2026-03-15');

      const where = prisma.order.findMany.mock.calls[0][0].where;
      expect(where.createdAt.gte).toEqual(new Date(2026, 2, 15, 0, 0, 0, 0));
      expect(where.createdAt.lt).toEqual(new Date(2026, 2, 16, 0, 0, 0, 0));
    });

    it('defaults to today when no day is given', async () => {
      prisma.order.findMany.mockResolvedValue([]);
      const now = new Date();

      const res = await service.getProductionTotals();

      const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      expect(res.day).toBe(expected);
    });
  });
});
