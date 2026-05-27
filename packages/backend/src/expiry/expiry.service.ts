import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

const SWEEP_INTERVAL_MS = 60_000;

@Injectable()
export class ExpiryService {
  private readonly logger = new Logger(ExpiryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Active sweep (~every minute): flips every `pending` order whose token has
   * expired to `ignored`. Active expiry (vs. lazy relabel on read) keeps the
   * table honest for `GROUP BY status` metrics — no stale `pending` rows. Only
   * `pending` orders are touched, so `issued`/`denied` are never affected.
   */
  @Interval(SWEEP_INTERVAL_MS)
  async sweepExpired(): Promise<number> {
    const { count } = await this.prisma.order.updateMany({
      where: { status: 'pending', expiresAt: { lt: new Date() } },
      data: { status: 'ignored' },
    });
    if (count > 0) {
      this.logger.log(`Expired ${count} pending order(s) → ignored.`);
    }
    return count;
  }
}
