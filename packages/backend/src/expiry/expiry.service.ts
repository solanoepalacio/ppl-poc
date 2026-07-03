import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

const SWEEP_INTERVAL_MS = 60_000;

@Injectable()
export class ExpiryService {
  private readonly logger = new Logger(ExpiryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Backstop sweep (~every minute): flips any `pending` order whose production
   * bloque is already `closed` to `ignored`. Closing a bloque already flips its
   * pending orders in-transaction, so in normal operation this finds nothing —
   * it exists to reconcile a `pending` row that somehow escaped that flip (e.g.
   * a manual DB edit), keeping the table honest for `GROUP BY status` metrics.
   * Only `pending` orders are touched, so `issued`/`denied` are never affected.
   */
  @Interval(SWEEP_INTERVAL_MS)
  async sweepExpired(): Promise<number> {
    const { count } = await this.prisma.order.updateMany({
      where: { status: 'pending', slot: { status: 'closed' } },
      data: { status: 'ignored' },
    });
    if (count > 0) {
      this.logger.log(`Expired ${count} pending order(s) in closed bloque(s) → ignored.`);
    }
    return count;
  }
}
