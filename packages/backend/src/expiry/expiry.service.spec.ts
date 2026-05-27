import { ExpiryService } from './expiry.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('ExpiryService', () => {
  let prisma: { order: { updateMany: jest.Mock } };
  let service: ExpiryService;

  beforeEach(() => {
    prisma = { order: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) } };
    service = new ExpiryService(prisma as unknown as PrismaService);
  });

  it('flips only expired pending orders to ignored', async () => {
    const count = await service.sweepExpired();

    expect(count).toBe(1);
    const arg = prisma.order.updateMany.mock.calls[0][0];
    // Targets only pending + expired orders...
    expect(arg.where.status).toBe('pending');
    expect(arg.where.expiresAt.lt).toBeInstanceOf(Date);
    // ...and the only mutation is the transition to ignored.
    expect(arg.data).toEqual({ status: 'ignored' });
  });

  it('leaves issued/denied orders untouched (where-clause is pending-only)', async () => {
    prisma.order.updateMany.mockResolvedValue({ count: 0 });

    const count = await service.sweepExpired();

    expect(count).toBe(0);
    // The query never selects non-pending statuses, so issued/denied are safe.
    expect(prisma.order.updateMany.mock.calls[0][0].where.status).toBe(
      'pending',
    );
  });
});
