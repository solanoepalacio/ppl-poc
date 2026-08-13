import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import type { PrismaService } from '../prisma/prisma.service';

type ProductMock = {
  findMany: jest.Mock;
  findFirst: jest.Mock;
  findUnique: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
};

type PrismaMock = { product: ProductMock };

const row = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'p1',
  name: 'Alfajor de nuez',
  category: 'sweet',
  threshold: 0,
  active: true,
  ...over,
});

describe('ProductsService', () => {
  let prisma: PrismaMock;
  let service: ProductsService;

  beforeEach(() => {
    prisma = {
      product: {
        findMany: jest.fn().mockResolvedValue([]),
        // No collision unless a test says so.
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(),
        create: jest
          .fn()
          .mockImplementation(({ data }) => ({ id: 'new', ...data })),
        update: jest.fn().mockImplementation(({ data }) => row(data)),
        delete: jest.fn().mockResolvedValue(row()),
      },
    };
    service = new ProductsService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('adds an active product on the given line', async () => {
      const created = await service.create({
        name: 'Pan de campo',
        category: 'salty',
      });

      expect(created).toMatchObject({
        name: 'Pan de campo',
        category: 'salty',
        active: true,
      });
    });

    it('starts a product with no threshold', async () => {
      // Zero is the ordinary case, not a special one: it means "produce what was
      // ordered", which is what every product did before thresholds existed.
      const created = await service.create({
        name: 'Pan de campo',
        category: 'salty',
      });

      expect(created.threshold).toBe(0);
    });

    it('rejects a duplicate name and persists nothing', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: 'other' });

      await expect(
        service.create({ name: 'Alfajor de nuez', category: 'sweet' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.product.create).not.toHaveBeenCalled();
    });

    it('rejects a blank name', async () => {
      await expect(
        service.create({ name: '   ', category: 'sweet' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an unknown production line', async () => {
      await expect(
        service.create({
          name: 'Pan',
          category: 'agridulce' as 'sweet',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.product.create).not.toHaveBeenCalled();
    });

    it('rejects a negative threshold', async () => {
      // Rejected rather than clamped: a negative one is somebody meaning
      // something else, and reading it as zero would hide that.
      await expect(
        service.create({ name: 'Pan', category: 'salty', threshold: -5 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a fractional threshold', async () => {
      await expect(
        service.create({ name: 'Pan', category: 'salty', threshold: 2.5 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('update', () => {
    beforeEach(() => prisma.product.findUnique.mockResolvedValue(row()));

    it('changes the threshold', async () => {
      await service.update('p1', { threshold: 100 });

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { threshold: 100 },
      });
    });

    it('renames without touching identity', async () => {
      await service.update('p1', { name: 'Alfajor de nuez sin azúcar' });

      const { data } = prisma.product.update.mock.calls[0][0];
      expect(data).toEqual({ name: 'Alfajor de nuez sin azúcar' });
      expect(data.id).toBeUndefined();
    });

    it('rejects a rename onto another product', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: 'other' });

      await expect(
        service.update('p1', { name: 'Ciabatta' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.product.update).not.toHaveBeenCalled();
    });

    it('lets a product keep its own name', async () => {
      await service.update('p1', { name: 'Alfajor de nuez' });

      // Unchanged, so nothing to check and nothing to write.
      expect(prisma.product.findFirst).not.toHaveBeenCalled();
      expect(prisma.product.update).not.toHaveBeenCalled();
    });

    it('moves a product to the other line', async () => {
      await service.update('p1', { category: 'salty' });

      expect(prisma.product.update.mock.calls[0][0].data).toEqual({
        category: 'salty',
      });
    });

    it('rejects a negative threshold on an existing product', async () => {
      await expect(
        service.update('p1', { threshold: -1 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.product.update).not.toHaveBeenCalled();
    });

    it('reports a product that is not there', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.update('nope', { threshold: 1 })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('deletes a product no order references', async () => {
      prisma.product.findUnique.mockResolvedValue({
        ...row(),
        _count: { orderItems: 0 },
      });

      expect(await service.remove('p1')).toEqual({ id: 'p1', outcome: 'deleted' });
      expect(prisma.product.delete).toHaveBeenCalled();
    });

    it('retires a product an order references, keeping the history', async () => {
      prisma.product.findUnique.mockResolvedValue({
        ...row(),
        _count: { orderItems: 3 },
      });

      expect(await service.remove('p1')).toEqual({
        id: 'p1',
        outcome: 'deactivated',
      });
      expect(prisma.product.delete).not.toHaveBeenCalled();
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { active: false },
      });
    });
  });

  describe('list', () => {
    it('offers only active products', async () => {
      await service.list();

      // This is what the customer form reads: a retired product must not be
      // orderable.
      expect(prisma.product.findMany.mock.calls[0][0].where).toEqual({
        active: true,
      });
    });

    it('lists the whole catalog with its order counts for the management view', async () => {
      prisma.product.findMany.mockResolvedValue([
        { ...row(), _count: { orderItems: 4 } },
      ]);

      const managed = await service.listManaged();

      expect(managed[0]).toMatchObject({ id: 'p1', orderCount: 4 });
      expect(prisma.product.findMany.mock.calls[0][0].where).toBeUndefined();
    });
  });
});
