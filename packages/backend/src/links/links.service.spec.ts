import { BadRequestException } from '@nestjs/common';
import { LinksService } from './links.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { SlotsService } from '../slots/slots.service';
import type { ClientsService } from '../clients/clients.service';

describe('LinksService', () => {
  let prisma: { order: { create: jest.Mock; findFirst: jest.Mock } };
  let slots: { getOpenSlot: jest.Mock };
  let clients: { assertActive: jest.Mock };
  let service: LinksService;

  beforeEach(() => {
    prisma = { order: { create: jest.fn(), findFirst: jest.fn() } };
    slots = {
      getOpenSlot: jest.fn().mockResolvedValue({
        id: 'slot_open',
        seq: 5,
        status: 'open',
        openedAt: new Date('2026-03-15T00:00:00.000Z'),
        closedAt: null,
      }),
    };
    clients = { assertActive: jest.fn().mockResolvedValue(undefined) };
    service = new LinksService(
      prisma as unknown as PrismaService,
      slots as unknown as SlotsService,
      clients as unknown as ClientsService,
    );
    process.env.FRONTEND_BASE_URL = 'http://localhost:3001';
  });

  it('creates an unconsumed order + token and returns the share URL for a valid client', async () => {
    prisma.order.create.mockImplementation(async ({ data }) => ({
      id: 'order_1',
      clientId: data.clientId,
      client: { name: 'Il Postino' },
      token: data.token,
      slotId: data.slotId,
      createdAt: new Date(),
      confirmedAt: null,
      consumedAt: null,
    }));

    const res = await service.createLink('client_1');

    expect(clients.assertActive).toHaveBeenCalledWith('client_1');
    expect(prisma.order.create).toHaveBeenCalledTimes(1);
    const createArg = prisma.order.create.mock.calls[0][0].data;
    expect(createArg.clientId).toBe('client_1');
    expect(createArg.token).toBeTruthy();
    expect(createArg.slotId).toBe('slot_open'); // stamped with the open bloque
    expect(slots.getOpenSlot).toHaveBeenCalledTimes(1);
    expect(res.url).toBe(`http://localhost:3001/order/${res.token}`);
    expect(res.clientId).toBe('client_1');
    expect(res.clientName).toBe('Il Postino');
    expect(res.slotSeq).toBe(5); // the open bloque the link is valid for
  });

  it('rejects a missing/inactive client without creating an order', async () => {
    clients.assertActive.mockRejectedValue(new BadRequestException());

    await expect(service.createLink('nope')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  describe('linkForAgent', () => {
    it('reuses the client unconsumed link for the open bloque', async () => {
      prisma.order.findFirst.mockResolvedValue({
        id: 'order_old',
        clientId: 'client_1',
        token: 'tok_old',
        client: { name: 'Alo Bar' },
      });

      const res = await service.linkForAgent('client_1');

      // The manager pressing "Generar link" means "make me one"; a customer
      // sending a second message does not.
      expect(prisma.order.create).not.toHaveBeenCalled();
      expect(res.reused).toBe(true);
      expect(res.token).toBe('tok_old');
      expect(res.url).toContain('tok_old');
    });

    it('only reuses a link that is still good', async () => {
      prisma.order.findFirst.mockResolvedValue(null);
      prisma.order.create.mockResolvedValue({
        id: 'order_new',
        clientId: 'client_1',
        token: 'tok_new',
        client: { name: 'Alo Bar' },
      });

      await service.linkForAgent('client_1');

      // Unconsumed, and in the bloque that is open now — a closed bloque's link
      // no longer resolves, so reusing it would send a dead URL.
      expect(prisma.order.findFirst.mock.calls[0][0].where).toEqual({
        clientId: 'client_1',
        slotId: 'slot_open',
        consumedAt: null,
      });
    });

    it('creates one when the client has none outstanding', async () => {
      prisma.order.findFirst.mockResolvedValue(null);
      prisma.order.create.mockResolvedValue({
        id: 'order_new',
        clientId: 'client_1',
        token: 'tok_new',
        client: { name: 'Alo Bar' },
      });

      const res = await service.linkForAgent('client_1');

      expect(prisma.order.create).toHaveBeenCalled();
      expect(res.reused).toBe(false);
    });

    it('rejects an inactive client, like the manual path', async () => {
      clients.assertActive.mockRejectedValue(new BadRequestException('nope'));

      await expect(service.linkForAgent('client_1')).rejects.toThrow(BadRequestException);
      expect(prisma.order.create).not.toHaveBeenCalled();
    });
  });
});
