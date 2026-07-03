import { Injectable } from '@nestjs/common';
import type { CreateLinkResponse } from '@pannico/shared';
import { PrismaService } from '../prisma/prisma.service';
import { SlotsService } from '../slots/slots.service';
import { ClientsService } from '../clients/clients.service';
import { generateToken } from '../common/token.util';

@Injectable()
export class LinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly slotsService: SlotsService,
    private readonly clientsService: ClientsService,
  ) {}

  /**
   * Validates the client (rejecting missing/inactive), then creates a unique
   * token + a `pending` order for that client, and returns the shareable URL.
   */
  async createLink(clientId: string): Promise<CreateLinkResponse> {
    await this.clientsService.assertActive(clientId);

    const slot = await this.slotsService.getOpenSlot();
    const order = await this.prisma.order.create({
      data: {
        clientId,
        token: generateToken(),
        status: 'pending',
        slotId: slot.id,
      },
      include: { client: true },
    });

    const base = process.env.FRONTEND_BASE_URL ?? 'http://localhost:3001';
    return {
      orderId: order.id,
      clientId: order.clientId,
      clientName: order.client.name,
      token: order.token,
      url: `${base.replace(/\/$/, '')}/order/${order.token}`,
      slotSeq: slot.seq,
    };
  }
}
