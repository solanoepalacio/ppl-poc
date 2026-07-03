import { BadRequestException } from '@nestjs/common';
import { LinksService } from './links.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { SlotsService } from '../slots/slots.service';

describe('LinksService', () => {
  let prisma: { order: { create: jest.Mock } };
  let slots: { getOpenSlotId: jest.Mock };
  let service: LinksService;

  beforeEach(() => {
    prisma = { order: { create: jest.fn() } };
    slots = { getOpenSlotId: jest.fn().mockResolvedValue('slot_open') };
    service = new LinksService(
      prisma as unknown as PrismaService,
      slots as unknown as SlotsService,
    );
    process.env.FRONTEND_BASE_URL = 'http://localhost:3001';
  });

  it('creates a pending order + token and returns the share URL for a valid phone', async () => {
    prisma.order.create.mockImplementation(async ({ data }) => ({
      id: 'order_1',
      phone: data.phone,
      token: data.token,
      status: data.status,
      expiresAt: data.expiresAt,
      createdAt: new Date(),
      confirmedAt: null,
    }));

    const res = await service.createLink('+54 9 11 2233-4455');

    expect(prisma.order.create).toHaveBeenCalledTimes(1);
    const createArg = prisma.order.create.mock.calls[0][0].data;
    expect(createArg.status).toBe('pending');
    expect(createArg.phone).toBe('+5491122334455'); // normalized to E.164
    expect(createArg.token).toBeTruthy();
    expect(createArg.slotId).toBe('slot_open'); // stamped with the open bloque
    expect(slots.getOpenSlotId).toHaveBeenCalledTimes(1);
    expect(res.url).toBe(`http://localhost:3001/order/${res.token}`);
    expect(res.phone).toBe('+5491122334455');
  });

  it('rejects a malformed phone without creating an order', async () => {
    await expect(service.createLink('not-a-phone')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.createLink('')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.order.create).not.toHaveBeenCalled();
  });
});
