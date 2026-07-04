import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SlotsService } from './slots.service';
import type { PrismaService } from '../prisma/prisma.service';

type SlotMock = {
  findFirst: jest.Mock;
  findUnique: jest.Mock;
  findMany: jest.Mock;
  aggregate: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
};

type SlotExistenceMock = {
  findMany: jest.Mock;
  deleteMany: jest.Mock;
  createMany: jest.Mock;
};

type ProductMock = {
  findMany: jest.Mock;
};

type PrismaMock = {
  slot: SlotMock;
  slotExistence: SlotExistenceMock;
  product: ProductMock;
  $transaction: jest.Mock;
};

function makePrisma(): PrismaMock {
  const slot: SlotMock = {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    aggregate: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const slotExistence: SlotExistenceMock = {
    findMany: jest.fn(),
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  };
  const product: ProductMock = { findMany: jest.fn() };
  return {
    slot,
    slotExistence,
    product,
    // Runs the callback with the same mocks as the transactional client.
    $transaction: jest.fn((cb: (tx: unknown) => unknown) =>
      cb({ slot, slotExistence, product }),
    ),
  };
}

const openSlot = {
  id: 'slot_open',
  seq: 2,
  status: 'open',
  openedAt: new Date('2026-03-15T00:00:00.000Z'),
  closedAt: null,
};

describe('SlotsService', () => {
  let prisma: PrismaMock;
  let service: SlotsService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new SlotsService(prisma as unknown as PrismaService);
  });

  describe('ensureOpenSlot', () => {
    it('returns the existing open bloque without creating one', async () => {
      prisma.slot.findFirst.mockResolvedValue(openSlot);

      const res = await service.ensureOpenSlot();

      expect(res).toBe(openSlot);
      expect(prisma.slot.create).not.toHaveBeenCalled();
    });

    it('creates the first open bloque (seq 1) when none exists', async () => {
      prisma.slot.findFirst.mockResolvedValue(null);
      prisma.slot.aggregate.mockResolvedValue({ _max: { seq: null } });
      prisma.slot.create.mockResolvedValue({ ...openSlot, seq: 1 });

      const res = await service.ensureOpenSlot();

      expect(prisma.slot.create).toHaveBeenCalledWith({
        data: { seq: 1, status: 'open' },
      });
      expect(res.seq).toBe(1);
    });

    it('swallows a P2002 race and returns the winner’s open bloque', async () => {
      prisma.slot.findFirst
        .mockResolvedValueOnce(null) // initial check: none
        .mockResolvedValueOnce(openSlot); // re-read after the race
      prisma.slot.aggregate.mockResolvedValue({ _max: { seq: 1 } });
      prisma.slot.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('unique', {
          code: 'P2002',
          clientVersion: '5',
        }),
      );

      const res = await service.ensureOpenSlot();

      expect(res).toBe(openSlot);
    });
  });

  describe('closeSlot', () => {
    it('closes the open bloque and opens the next (seq max+1)', async () => {
      prisma.slot.findUnique.mockResolvedValue(openSlot);
      prisma.slot.update.mockResolvedValue({
        ...openSlot,
        status: 'closed',
        closedAt: new Date('2026-03-20T00:00:00.000Z'),
      });
      prisma.slot.aggregate.mockResolvedValue({ _max: { seq: 2 } });
      prisma.slot.create.mockResolvedValue({
        id: 'slot_new',
        seq: 3,
        status: 'open',
        openedAt: new Date('2026-03-20T00:00:00.000Z'),
        closedAt: null,
      });

      const res = await service.closeSlot('slot_open');

      expect(prisma.slot.update).toHaveBeenCalledWith({
        where: { id: 'slot_open' },
        data: { status: 'closed', closedAt: expect.any(Date) },
      });
      expect(prisma.slot.create).toHaveBeenCalledWith({
        data: { seq: 3, status: 'open' },
      });
      expect(res.closed.id).toBe('slot_open');
      expect(res.closed.status).toBe('closed');
      expect(res.open.seq).toBe(3);
      expect(res.open.status).toBe('open');
    });

    it('throws NotFound for a missing bloque', async () => {
      prisma.slot.findUnique.mockResolvedValue(null);

      await expect(service.closeSlot('nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.slot.update).not.toHaveBeenCalled();
    });

    it('rejects closing an already-closed bloque', async () => {
      prisma.slot.findUnique.mockResolvedValue({
        ...openSlot,
        status: 'closed',
      });

      await expect(service.closeSlot('slot_open')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.slot.create).not.toHaveBeenCalled();
    });
  });

  describe('resolveSlot', () => {
    it('returns the requested bloque when a slotId is given', async () => {
      const closed = { ...openSlot, id: 'slot_7', seq: 7, status: 'closed' };
      prisma.slot.findUnique.mockResolvedValue(closed);

      const res = await service.resolveSlot('slot_7');

      expect(res).toBe(closed);
      expect(prisma.slot.findFirst).not.toHaveBeenCalled();
    });

    it('throws NotFound for an unknown slotId', async () => {
      prisma.slot.findUnique.mockResolvedValue(null);

      await expect(service.resolveSlot('nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('falls back to the open bloque when no slotId is given', async () => {
      prisma.slot.findFirst.mockResolvedValue(openSlot);

      const res = await service.resolveSlot();

      expect(res).toBe(openSlot);
    });
  });

  describe('getExistence', () => {
    it('returns recorded existence rows for the resolved bloque', async () => {
      prisma.slot.findUnique.mockResolvedValue(openSlot);
      prisma.slotExistence.findMany.mockResolvedValue([
        { productId: 'p1', quantity: 3 },
        { productId: 'p2', quantity: 5 },
      ]);

      const res = await service.getExistence('slot_open');

      expect(prisma.slotExistence.findMany).toHaveBeenCalledWith({
        where: { slotId: 'slot_open' },
        select: { productId: true, quantity: true },
      });
      expect(res.slot.id).toBe('slot_open');
      expect(res.items).toEqual([
        { productId: 'p1', quantity: 3 },
        { productId: 'p2', quantity: 5 },
      ]);
    });
  });

  describe('setExistence', () => {
    it('replaces existence, dropping zero-quantity entries', async () => {
      prisma.slot.findUnique.mockResolvedValue(openSlot);
      prisma.product.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);

      const res = await service.setExistence('slot_open', [
        { productId: 'p1', quantity: 4 },
        { productId: 'p2', quantity: 0 },
      ]);

      expect(prisma.slotExistence.deleteMany).toHaveBeenCalledWith({
        where: { slotId: 'slot_open' },
      });
      expect(prisma.slotExistence.createMany).toHaveBeenCalledWith({
        data: [{ slotId: 'slot_open', productId: 'p1', quantity: 4 }],
      });
      expect(res.items).toEqual([{ productId: 'p1', quantity: 4 }]);
    });

    it('clears all existence when every quantity is zero (no createMany)', async () => {
      prisma.slot.findUnique.mockResolvedValue(openSlot);
      prisma.product.findMany.mockResolvedValue([{ id: 'p1' }]);

      const res = await service.setExistence('slot_open', [
        { productId: 'p1', quantity: 0 },
      ]);

      expect(prisma.slotExistence.deleteMany).toHaveBeenCalledWith({
        where: { slotId: 'slot_open' },
      });
      expect(prisma.slotExistence.createMany).not.toHaveBeenCalled();
      expect(res.items).toEqual([]);
    });

    it('rejects setting existence on a closed bloque', async () => {
      prisma.slot.findUnique.mockResolvedValue({
        ...openSlot,
        status: 'closed',
      });

      await expect(
        service.setExistence('slot_open', [{ productId: 'p1', quantity: 1 }]),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.slotExistence.deleteMany).not.toHaveBeenCalled();
    });

    it('rejects a product not in the catalog', async () => {
      prisma.slot.findUnique.mockResolvedValue(openSlot);
      prisma.product.findMany.mockResolvedValue([]);

      await expect(
        service.setExistence('slot_open', [{ productId: 'ghost', quantity: 1 }]),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.slotExistence.deleteMany).not.toHaveBeenCalled();
    });

    it('rejects a negative quantity', async () => {
      prisma.slot.findUnique.mockResolvedValue(openSlot);
      prisma.product.findMany.mockResolvedValue([{ id: 'p1' }]);

      await expect(
        service.setExistence('slot_open', [{ productId: 'p1', quantity: -2 }]),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('getExistenceMap', () => {
    it('maps productId to quantity for the bloque', async () => {
      prisma.slotExistence.findMany.mockResolvedValue([
        { productId: 'p1', quantity: 3 },
      ]);

      const map = await service.getExistenceMap('slot_open');

      expect(map.get('p1')).toBe(3);
      expect(map.has('p2')).toBe(false);
    });
  });

  describe('listSlots', () => {
    it('maps bloques to DTOs with their order counts, newest first', async () => {
      prisma.slot.findMany.mockResolvedValue([
        { ...openSlot, _count: { orders: 4 } },
      ]);

      const res = await service.listSlots();

      expect(prisma.slot.findMany).toHaveBeenCalledWith({
        orderBy: { seq: 'desc' },
        include: { _count: { select: { orders: true } } },
      });
      expect(res.slots[0]).toEqual({
        id: 'slot_open',
        seq: 2,
        status: 'open',
        openedAt: openSlot.openedAt.toISOString(),
        closedAt: null,
        orderCount: 4,
      });
    });
  });
});
