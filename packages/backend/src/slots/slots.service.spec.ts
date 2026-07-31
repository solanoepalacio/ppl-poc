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

/** Existencia: one row per product, written replace-all. */
type SlotExistenceMock = {
  findMany: jest.Mock;
  deleteMany: jest.Mock;
  createMany: jest.Mock;
};

/**
 * Producción real: one row per recorded batch, so it needs per-row create/update
 * and a groupBy to sum a product's entries — not the createMany of a replace-all
 * table.
 */
type SlotProducedMock = {
  findMany: jest.Mock;
  deleteMany: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  groupBy: jest.Mock;
};

type ProductMock = {
  findMany: jest.Mock;
};

type PrismaMock = {
  slot: SlotMock;
  slotExistence: SlotExistenceMock;
  slotProduced: SlotProducedMock;
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
  const slotProduced: SlotProducedMock = {
    findMany: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    groupBy: jest.fn().mockResolvedValue([]),
  };
  const product: ProductMock = { findMany: jest.fn() };
  return {
    slot,
    slotExistence,
    slotProduced,
    product,
    // Runs the callback with the same mocks as the transactional client.
    $transaction: jest.fn((cb: (tx: unknown) => unknown) =>
      cb({ slot, slotExistence, slotProduced, product }),
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

  // Producción real is a history: one row per recorded batch, and a product's
  // figure is the SUM of its rows. The write replaces the *set of entries*, so
  // these cover what that means — keeping, updating, creating and deleting — plus
  // the guards that stop an id from another bloque being smuggled in.
  describe('setProduced', () => {
    it('creates an entry for a batch with no id', async () => {
      prisma.slot.findUnique.mockResolvedValue(openSlot);
      prisma.product.findMany.mockResolvedValue([{ id: 'p1' }]);
      prisma.slotProduced.findMany
        .mockResolvedValueOnce([]) // existing ids, before the write
        .mockResolvedValueOnce([]); // re-read by getProduced afterwards

      await service.setProduced('slot_open', [
        { productId: 'p1', entries: [{ quantity: 4 }] },
      ]);

      expect(prisma.slotProduced.create).toHaveBeenCalledWith({
        data: { slotId: 'slot_open', productId: 'p1', quantity: 4 },
      });
      expect(prisma.slotProduced.update).not.toHaveBeenCalled();
      expect(prisma.slotProduced.deleteMany).not.toHaveBeenCalled();
    });

    it('updates an existing entry by id and keeps its createdAt', async () => {
      prisma.slot.findUnique.mockResolvedValue(openSlot);
      prisma.product.findMany.mockResolvedValue([{ id: 'p1' }]);
      prisma.slotProduced.findMany
        .mockResolvedValueOnce([{ id: 'e1', productId: 'p1' }])
        .mockResolvedValueOnce([]);

      await service.setProduced('slot_open', [
        { productId: 'p1', entries: [{ id: 'e1', quantity: 3 }] },
      ]);

      expect(prisma.slotProduced.update).toHaveBeenCalledWith({
        where: { id: 'e1' },
        data: { quantity: 3 },
      });
      // Only the quantity is written — createdAt is never in the update payload.
      const payload = prisma.slotProduced.update.mock.calls[0][0].data;
      expect(payload).toEqual({ quantity: 3 });
      expect(prisma.slotProduced.create).not.toHaveBeenCalled();
    });

    it('deletes existing entries the client did not send', async () => {
      prisma.slot.findUnique.mockResolvedValue(openSlot);
      prisma.product.findMany.mockResolvedValue([{ id: 'p1' }]);
      prisma.slotProduced.findMany
        .mockResolvedValueOnce([
          { id: 'e1', productId: 'p1' },
          { id: 'e2', productId: 'p1' },
        ])
        .mockResolvedValueOnce([]);

      await service.setProduced('slot_open', [
        { productId: 'p1', entries: [{ id: 'e2', quantity: 5 }] },
      ]);

      expect(prisma.slotProduced.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['e1'] } },
      });
    });

    it('clears a product history entirely when it is sent with no entries', async () => {
      prisma.slot.findUnique.mockResolvedValue(openSlot);
      prisma.product.findMany.mockResolvedValue([{ id: 'p1' }]);
      prisma.slotProduced.findMany
        .mockResolvedValueOnce([
          { id: 'e1', productId: 'p1' },
          { id: 'e2', productId: 'p1' },
        ])
        .mockResolvedValueOnce([]);

      await service.setProduced('slot_open', [
        { productId: 'p1', entries: [] },
      ]);

      expect(prisma.slotProduced.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['e1', 'e2'] } },
      });
      expect(prisma.slotProduced.create).not.toHaveBeenCalled();
    });

    it('leaves untouched the products the client did not send', async () => {
      // The dialog sends its whole view on save, so a tab holding a stale read
      // must not be able to delete a product added since it loaded — merely
      // opening it and pressing Guardar would otherwise wipe that history.
      prisma.slot.findUnique.mockResolvedValue(openSlot);
      prisma.product.findMany.mockResolvedValue([{ id: 'p1' }]);
      prisma.slotProduced.findMany
        .mockResolvedValueOnce([
          { id: 'e1', productId: 'p1' },
          { id: 'e_otro', productId: 'p_desconocido' },
        ])
        .mockResolvedValueOnce([]);

      await service.setProduced('slot_open', [
        { productId: 'p1', entries: [{ id: 'e1', quantity: 5 }] },
      ]);

      // p_desconocido was never named, so none of its entries are deleted.
      expect(prisma.slotProduced.deleteMany).not.toHaveBeenCalled();
    });

    it('deletes nothing when sent an empty item list', async () => {
      prisma.slot.findUnique.mockResolvedValue(openSlot);
      prisma.slotProduced.findMany
        .mockResolvedValueOnce([{ id: 'e1', productId: 'p1' }])
        .mockResolvedValueOnce([]);

      await service.setProduced('slot_open', []);

      // Naming no products touches no products; clearing one means sending it
      // with an empty `entries`.
      expect(prisma.slotProduced.deleteMany).not.toHaveBeenCalled();
    });

    it('rejects an id that does not belong to this bloque', async () => {
      prisma.slot.findUnique.mockResolvedValue(openSlot);
      prisma.product.findMany.mockResolvedValue([{ id: 'p1' }]);
      prisma.slotProduced.findMany.mockResolvedValueOnce([
        { id: 'e1', productId: 'p1' },
      ]);

      await expect(
        service.setProduced('slot_open', [
          { productId: 'p1', entries: [{ id: 'from_another_bloque', quantity: 1 }] },
        ]),
      ).rejects.toBeInstanceOf(BadRequestException);
      // Nothing is written when validation fails.
      expect(prisma.slotProduced.deleteMany).not.toHaveBeenCalled();
      expect(prisma.slotProduced.update).not.toHaveBeenCalled();
    });

    it('rejects an id belonging to a different product', async () => {
      prisma.slot.findUnique.mockResolvedValue(openSlot);
      prisma.product.findMany.mockResolvedValue([{ id: 'p1' }]);
      prisma.slotProduced.findMany.mockResolvedValueOnce([
        { id: 'e1', productId: 'p2' },
      ]);

      await expect(
        service.setProduced('slot_open', [
          { productId: 'p1', entries: [{ id: 'e1', quantity: 1 }] },
        ]),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.slotProduced.update).not.toHaveBeenCalled();
    });

    it('rejects the same entry id sent twice', async () => {
      prisma.slot.findUnique.mockResolvedValue(openSlot);
      prisma.product.findMany.mockResolvedValue([{ id: 'p1' }]);
      prisma.slotProduced.findMany.mockResolvedValueOnce([
        { id: 'e1', productId: 'p1' },
      ]);

      await expect(
        service.setProduced('slot_open', [
          {
            productId: 'p1',
            entries: [
              { id: 'e1', quantity: 1 },
              { id: 'e1', quantity: 2 },
            ],
          },
        ]),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects changing the history on a closed bloque', async () => {
      prisma.slot.findUnique.mockResolvedValue({
        ...openSlot,
        status: 'closed',
      });

      await expect(
        service.setProduced('slot_open', [
          { productId: 'p1', entries: [{ quantity: 1 }] },
        ]),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.slotProduced.deleteMany).not.toHaveBeenCalled();
      expect(prisma.slotProduced.create).not.toHaveBeenCalled();
    });

    it('rejects a product not in the catalog', async () => {
      prisma.slot.findUnique.mockResolvedValue(openSlot);
      prisma.product.findMany.mockResolvedValue([]);

      await expect(
        service.setProduced('slot_open', [
          { productId: 'ghost', entries: [{ quantity: 1 }] },
        ]),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.slotProduced.create).not.toHaveBeenCalled();
    });

    it('rejects a zero or negative entry quantity', async () => {
      prisma.slot.findUnique.mockResolvedValue(openSlot);
      prisma.product.findMany.mockResolvedValue([{ id: 'p1' }]);

      // Zero is not a batch — deleting an entry has its own control.
      await expect(
        service.setProduced('slot_open', [
          { productId: 'p1', entries: [{ quantity: 0 }] },
        ]),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.setProduced('slot_open', [
          { productId: 'p1', entries: [{ quantity: -2 }] },
        ]),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a non-integer entry quantity', async () => {
      prisma.slot.findUnique.mockResolvedValue(openSlot);
      prisma.product.findMany.mockResolvedValue([{ id: 'p1' }]);

      await expect(
        service.setProduced('slot_open', [
          { productId: 'p1', entries: [{ quantity: 1.5 }] },
        ]),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('leaves existencia untouched — the two figures are independent', async () => {
      prisma.slot.findUnique.mockResolvedValue(openSlot);
      prisma.product.findMany.mockResolvedValue([{ id: 'p1' }]);
      prisma.slotProduced.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await service.setProduced('slot_open', [
        { productId: 'p1', entries: [{ quantity: 4 }] },
      ]);

      expect(prisma.slotExistence.deleteMany).not.toHaveBeenCalled();
      expect(prisma.slotExistence.createMany).not.toHaveBeenCalled();
    });

    it('leaves the produced history untouched when existencia is written', async () => {
      prisma.slot.findUnique.mockResolvedValue(openSlot);
      prisma.product.findMany.mockResolvedValue([{ id: 'p1' }]);

      await service.setExistence('slot_open', [
        { productId: 'p1', quantity: 4 },
      ]);

      expect(prisma.slotProduced.deleteMany).not.toHaveBeenCalled();
      expect(prisma.slotProduced.create).not.toHaveBeenCalled();
      expect(prisma.slotProduced.update).not.toHaveBeenCalled();
    });
  });

  describe('getProduced', () => {
    it('groups entries by product, sums them, and sorts by product name', async () => {
      prisma.slot.findUnique.mockResolvedValue(openSlot);
      prisma.slotProduced.findMany.mockResolvedValue([
        {
          id: 'e1',
          productId: 'p2',
          quantity: 20,
          createdAt: new Date('2026-07-30T10:00:00.000Z'),
          product: { name: 'Zapallo' },
        },
        {
          id: 'e2',
          productId: 'p1',
          quantity: 5,
          createdAt: new Date('2026-07-30T11:00:00.000Z'),
          product: { name: 'Alfajor' },
        },
        {
          id: 'e3',
          productId: 'p2',
          quantity: 30,
          createdAt: new Date('2026-07-30T12:00:00.000Z'),
          product: { name: 'Zapallo' },
        },
      ]);

      const res = await service.getProduced('slot_open');

      expect(res.items.map((i) => i.name)).toEqual(['Alfajor', 'Zapallo']);
      const zapallo = res.items[1];
      expect(zapallo.total).toBe(50);
      expect(zapallo.entries).toEqual([
        { id: 'e1', quantity: 20, createdAt: '2026-07-30T10:00:00.000Z' },
        { id: 'e3', quantity: 30, createdAt: '2026-07-30T12:00:00.000Z' },
      ]);
    });

    it('reports a product with no entries as absent, not as zero', async () => {
      prisma.slot.findUnique.mockResolvedValue(openSlot);
      prisma.slotProduced.findMany.mockResolvedValue([]);

      const res = await service.getProduced('slot_open');

      expect(res.items).toEqual([]);
    });

    it('reads entries oldest first, so the history reads chronologically', async () => {
      prisma.slot.findUnique.mockResolvedValue(openSlot);
      prisma.slotProduced.findMany.mockResolvedValue([]);

      await service.getProduced('slot_open');

      expect(prisma.slotProduced.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'asc' } }),
      );
    });
  });

  describe('getProducedMap', () => {
    it('sums each product entries into a productId to quantity map', async () => {
      prisma.slotProduced.groupBy.mockResolvedValue([
        { productId: 'p1', _sum: { quantity: 50 } },
      ]);

      const map = await service.getProducedMap('slot_open');

      expect(map.get('p1')).toBe(50);
      expect(map.has('p2')).toBe(false);
    });

    it('treats a null sum as zero', async () => {
      prisma.slotProduced.groupBy.mockResolvedValue([
        { productId: 'p1', _sum: { quantity: null } },
      ]);

      const map = await service.getProducedMap('slot_open');

      expect(map.get('p1')).toBe(0);
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
