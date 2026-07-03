import { BadRequestException, Injectable } from '@nestjs/common';
import type { Client } from '@pannico/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Active clients for the back-office picker, ordered by display name. */
  async list(): Promise<Client[]> {
    return this.prisma.client.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Ensures a client exists and is active, throwing `BadRequestException`
   * otherwise. The order-creation paths call this to validate a submitted
   * `clientId` before binding an order to it — mirrors the catalog check in
   * `OrdersService.validateItemsAgainstCatalog` so a bad reference can never
   * be persisted.
   */
  async assertActive(clientId: string): Promise<void> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { active: true },
    });
    if (!client || !client.active) {
      throw new BadRequestException(`Client ${clientId} is not available.`);
    }
  }
}
