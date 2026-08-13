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
    prisma = {
      order: {
        create: jest.fn().mockImplementation(async ({ data }) => ({
          id: 'order_new',
          client: { name: 'Il Postino' },
          createdAt: new Date(),
          confirmedAt: null,
          consumedAt: null,
          ...data,
        })),
        // No live link unless a test says so.
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
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
    expect(createArg.source).toBe('link'); // only these may be handed back
    expect(res.reused).toBe(false);
  });

  it('rejects a missing/inactive client without creating an order', async () => {
    clients.assertActive.mockRejectedValue(new BadRequestException());

    await expect(service.createLink('nope')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  it("returns the client's existing link for the bloque instead of a second one", async () => {
    prisma.order.findFirst.mockResolvedValue({
      id: 'order_existing',
      clientId: 'client_1',
      client: { name: 'Il Postino' },
      token: 'tok_already_shared',
      slotId: 'slot_open',
      createdAt: new Date(),
      confirmedAt: null,
      consumedAt: null,
      source: 'link',
    });

    const res = await service.createLink('client_1');

    expect(prisma.order.create).not.toHaveBeenCalled();
    expect(res.reused).toBe(true);
    expect(res.token).toBe('tok_already_shared');
    expect(res.orderId).toBe('order_existing');
    // Same shape as a freshly minted one — the two branches must not drift.
    expect(res.url).toBe('http://localhost:3001/order/tok_already_shared');
    expect(res.clientName).toBe('Il Postino');
    expect(res.slotSeq).toBe(5);
  });

  it('only ever reuses an unconsumed link-generated order in the open bloque', async () => {
    await service.createLink('client_1');

    // The whole safety of reuse is in this predicate: `source` keeps a manually
    // transcribed order — which also carries an unused token and a null
    // `consumedAt` — from being handed to a customer, and `slotId` +
    // `consumedAt` are the two halves of token validity.
    expect(prisma.order.findFirst.mock.calls[0][0].where).toEqual({
      clientId: 'client_1',
      slotId: 'slot_open',
      source: 'link',
      consumedAt: null,
    });
  });

  it('does not look for a link to reuse when the client is rejected', async () => {
    clients.assertActive.mockRejectedValue(new BadRequestException());

    await expect(service.createLink('nope')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.order.findFirst).not.toHaveBeenCalled();
  });
});
