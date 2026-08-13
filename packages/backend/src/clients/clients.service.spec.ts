import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ClientsService } from './clients.service';
import type { PrismaService } from '../prisma/prisma.service';

type ClientMock = {
  findMany: jest.Mock;
  findFirst: jest.Mock;
  findUnique: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
};

type PrismaMock = { client: ClientMock };

const row = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'c1',
  name: 'Alo Bar',
  slug: 'alo-bar',
  phone: null,
  active: true,
  ...over,
});

describe('ClientsService', () => {
  let prisma: PrismaMock;
  let service: ClientsService;

  beforeEach(() => {
    prisma = {
      client: {
        findMany: jest.fn().mockResolvedValue([]),
        // No collision unless a test says so.
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(),
        create: jest.fn().mockImplementation(({ data }) => ({ id: 'new', ...data })),
        update: jest.fn().mockImplementation(({ data }) => row(data)),
        delete: jest.fn().mockResolvedValue(row()),
      },
    };
    service = new ClientsService(prisma as unknown as PrismaService);
  });

  describe('list', () => {
    it('returns only active clients, by name', async () => {
      await service.list();

      expect(prisma.client.findMany).toHaveBeenCalledWith({
        where: { active: true },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('listManaged', () => {
    it('returns every client with its order count, retired ones included', async () => {
      prisma.client.findMany.mockResolvedValue([
        { ...row({ id: 'c1' }), _count: { orders: 3 } },
        { ...row({ id: 'c2', name: 'Beans', slug: 'beans', active: false }), _count: { orders: 0 } },
      ]);

      const res = await service.listManaged();

      // No `where`: retiring a client must not hide it from the view that
      // reinstates it.
      expect(prisma.client.findMany.mock.calls[0][0].where).toBeUndefined();
      expect(res).toEqual([
        { id: 'c1', name: 'Alo Bar', slug: 'alo-bar', phone: null, active: true, orderCount: 3 },
        { id: 'c2', name: 'Beans', slug: 'beans', phone: null, active: false, orderCount: 0 },
      ]);
      // `_count` is an implementation detail of the query, not of the contract.
      expect(res[0]).not.toHaveProperty('_count');
    });
  });

  describe('create', () => {
    it('derives the slug from the name and starts the client active', async () => {
      const created = await service.create({ name: '  Café Niño  ' });

      expect(prisma.client.create).toHaveBeenCalledWith({
        data: { name: 'Café Niño', slug: 'cafe-nino', phone: null, active: true },
      });
      expect(created.slug).toBe('cafe-nino');
    });

    it('stores a phone as digits only', async () => {
      await service.create({ name: 'Beans', phone: '+54 (381) 555-1234' });

      expect(prisma.client.create.mock.calls[0][0].data.phone).toBe('543815551234');
    });

    it('stores no phone when it is blank or has no digits', async () => {
      await service.create({ name: 'Beans', phone: '   ' });

      expect(prisma.client.create.mock.calls[0][0].data.phone).toBeNull();
    });

    it('rejects a duplicate name, naming the name', async () => {
      prisma.client.findFirst.mockResolvedValueOnce({ id: 'other' });

      await expect(service.create({ name: 'Alo Bar' })).rejects.toThrow(
        /Ya existe un cliente llamado "Alo Bar"/,
      );
      expect(prisma.client.create).not.toHaveBeenCalled();
    });

    it('rejects a colliding slug as a slug conflict, not a name one', async () => {
      // The name is free; it is the derived slug that already exists. The
      // manager cannot see that conflict in the list, so the message has to
      // point at the client it collides with.
      prisma.client.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ name: 'Alo Bar' });

      await expect(service.create({ name: 'ALO  BAR' })).rejects.toThrow(
        /coincide con "Alo Bar" salvo por mayúsculas/,
      );
      expect(prisma.client.create).not.toHaveBeenCalled();
    });

    it('rejects a phone another client already has', async () => {
      prisma.client.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ name: 'Beans' });

      await expect(
        service.create({ name: 'Nuevo', phone: '3815551234' }),
      ).rejects.toThrow(/Ese teléfono ya es el de "Beans"/);
      expect(prisma.client.create).not.toHaveBeenCalled();
    });

    it('rejects a name that is blank or has nothing to slugify', async () => {
      await expect(service.create({ name: '   ' })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create({ name: '¡!¿?' })).rejects.toThrow(
        /al menos una letra o un número/,
      );
    });
  });

  describe('update', () => {
    it('renames without touching the slug or the id', async () => {
      prisma.client.findUnique.mockResolvedValue(row());

      await service.update('c1', { name: 'Alo Bar Centro' });

      const data = prisma.client.update.mock.calls[0][0].data;
      expect(data).toEqual({ name: 'Alo Bar Centro' });
      expect(data).not.toHaveProperty('slug');
      expect(data).not.toHaveProperty('id');
    });

    it('rejects renaming onto another client name', async () => {
      prisma.client.findUnique.mockResolvedValue(row());
      prisma.client.findFirst.mockResolvedValueOnce({ id: 'other' });

      await expect(service.update('c1', { name: 'Beans' })).rejects.toThrow(
        /Ya existe un cliente llamado "Beans"/,
      );
      expect(prisma.client.update).not.toHaveBeenCalled();
    });

    it('does not collide a client with itself', async () => {
      prisma.client.findUnique.mockResolvedValue(row({ phone: '111' }));

      await service.update('c1', { name: 'Alo Bar', phone: '111' });

      // Both values are unchanged, so nothing is looked up and nothing written.
      expect(prisma.client.findFirst).not.toHaveBeenCalled();
      expect(prisma.client.update).not.toHaveBeenCalled();
    });

    it('excludes the client itself when checking a changed value', async () => {
      prisma.client.findUnique.mockResolvedValue(row());

      await service.update('c1', { name: 'Otro' });

      expect(prisma.client.findFirst.mock.calls[0][0].where).toEqual({
        name: 'Otro',
        id: { not: 'c1' },
      });
    });

    it('clears the phone when given null', async () => {
      prisma.client.findUnique.mockResolvedValue(row({ phone: '543815551234' }));

      await service.update('c1', { phone: null });

      expect(prisma.client.update.mock.calls[0][0].data).toEqual({ phone: null });
    });

    it('reinstates a retired client', async () => {
      prisma.client.findUnique.mockResolvedValue(row({ active: false }));

      await service.update('c1', { active: true });

      expect(prisma.client.update.mock.calls[0][0].data).toEqual({ active: true });
    });

    it('rejects an unknown client', async () => {
      prisma.client.findUnique.mockResolvedValue(null);

      await expect(service.update('nope', { name: 'x' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('deletes a client no order references', async () => {
      prisma.client.findUnique.mockResolvedValue({
        ...row(),
        _count: { orders: 0 },
      });

      const res = await service.remove('c1');

      expect(prisma.client.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
      expect(prisma.client.update).not.toHaveBeenCalled();
      expect(res).toEqual({ id: 'c1', outcome: 'deleted' });
    });

    it('retires a client orders reference, rather than deleting it', async () => {
      prisma.client.findUnique.mockResolvedValue({
        ...row(),
        _count: { orders: 2 },
      });

      const res = await service.remove('c1');

      // Deleting would orphan those orders: the FK has no cascade and closed
      // bloques are history.
      expect(prisma.client.delete).not.toHaveBeenCalled();
      expect(prisma.client.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { active: false },
      });
      expect(res).toEqual({ id: 'c1', outcome: 'deactivated' });
    });

    it('rejects an unknown client', async () => {
      prisma.client.findUnique.mockResolvedValue(null);

      await expect(service.remove('nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('assertActive', () => {
    it('passes for an active client and rejects an inactive or missing one', async () => {
      prisma.client.findUnique.mockResolvedValueOnce({ active: true });
      await expect(service.assertActive('c1')).resolves.toBeUndefined();

      prisma.client.findUnique.mockResolvedValueOnce({ active: false });
      await expect(service.assertActive('c1')).rejects.toThrow(
        BadRequestException,
      );

      prisma.client.findUnique.mockResolvedValueOnce(null);
      await expect(service.assertActive('c1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findByPhone', () => {
    it('resolves a client by its stored digits', async () => {
      prisma.client.findFirst.mockResolvedValueOnce(
        row({ phone: '5491122334455' }),
      );

      await expect(service.findByPhone('5491122334455')).resolves.toEqual({
        found: true,
        client: row({ phone: '5491122334455' }),
      });
    });

    it('normalizes the number before matching, and only matches active clients', async () => {
      prisma.client.findFirst.mockResolvedValueOnce(
        row({ phone: '5491122334455' }),
      );

      const res = await service.findByPhone('+54 9 11 2233-4455');

      expect(res.found).toBe(true);
      // However it was typed, it is the digits that are looked up — and a
      // retired client must not resolve, since it cannot be given a link.
      expect(prisma.client.findFirst.mock.calls[0][0].where).toEqual({
        phone: '5491122334455',
        active: true,
      });
    });

    it('reports an unknown number as not found rather than throwing', async () => {
      prisma.client.findFirst.mockResolvedValueOnce(null);

      await expect(service.findByPhone('5490000000000')).resolves.toEqual({
        found: false,
      });
    });

    it('treats a blank or digitless number as not found without querying', async () => {
      await expect(service.findByPhone('   ')).resolves.toEqual({
        found: false,
      });
      await expect(service.findByPhone('sin teléfono')).resolves.toEqual({
        found: false,
      });
      expect(prisma.client.findFirst).not.toHaveBeenCalled();
    });
  });
});
