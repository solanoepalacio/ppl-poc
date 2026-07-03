import { BadRequestException } from '@nestjs/common';
import { LinksService } from './links.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { SlotsService } from '../slots/slots.service';
import type { ClientsService } from '../clients/clients.service';

describe('LinksService', () => {
  let prisma: { order: { create: jest.Mock } };
  let slots: { getOpenSlotId: jest.Mock };
  let clients: { assertActive: jest.Mock };
  let service: LinksService;

  beforeEach(() => {
    prisma = { order: { create: jest.fn() } };
    slots = { getOpenSlotId: jest.fn().mockResolvedValue('slot_open') };
    clients = { assertActive: jest.fn().mockResolvedValue(undefined) };
    service = new LinksService(
      prisma as unknown as PrismaService,
      slots as unknown as SlotsService,
      clients as unknown as ClientsService,
    );
    process.env.FRONTEND_BASE_URL = 'http://localhost:3001';
  });

  it('creates a pending order + token and returns the share URL for a valid client', async () => {
    prisma.order.create.mockImplementation(async ({ data }) => ({
      id: 'order_1',
      clientId: data.clientId,
      client: { name: 'Il Postino' },
      token: data.token,
      status: data.status,
      expiresAt: data.expiresAt,
      createdAt: new Date(),
      confirmedAt: null,
    }));

    const res = await service.createLink('client_1');

    expect(clients.assertActive).toHaveBeenCalledWith('client_1');
    expect(prisma.order.create).toHaveBeenCalledTimes(1);
    const createArg = prisma.order.create.mock.calls[0][0].data;
    expect(createArg.status).toBe('pending');
    expect(createArg.clientId).toBe('client_1');
    expect(createArg.token).toBeTruthy();
    expect(createArg.slotId).toBe('slot_open'); // stamped with the open bloque
    expect(slots.getOpenSlotId).toHaveBeenCalledTimes(1);
    expect(res.url).toBe(`http://localhost:3001/order/${res.token}`);
    expect(res.clientId).toBe('client_1');
    expect(res.clientName).toBe('Il Postino');
  });

  it('rejects a missing/inactive client without creating an order', async () => {
    clients.assertActive.mockRejectedValue(new BadRequestException());

    await expect(service.createLink('nope')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.order.create).not.toHaveBeenCalled();
  });
});
