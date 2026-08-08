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
   * token + an unconsumed order for that client, and returns the shareable URL.
   */
  async createLink(clientId: string): Promise<CreateLinkResponse> {
    await this.clientsService.assertActive(clientId);

    const slot = await this.slotsService.getOpenSlot();
    const order = await this.prisma.order.create({
      data: {
        clientId,
        token: generateToken(),
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

  /**
   * The link to send an agent-driven customer: the one they already have if it
   * is still good, a new one otherwise.
   *
   * Deliberately **not** what `createLink` does. The manager pressing *Generar
   * link* means "make me a link" and gets one every time; a customer sending a
   * second message means nothing of the sort. Without this, "hola" / "quiero
   * pedir" / "?" leaves the bakery three pending orders for one customer and
   * three tokens that each still work.
   *
   * "Still good" is the same condition the token guard uses: unconsumed, in the
   * bloque that is open now. A link from a closed bloque no longer resolves, so
   * it is not reused.
   */
  async linkForAgent(
    clientId: string,
  ): Promise<CreateLinkResponse & { reused: boolean }> {
    await this.clientsService.assertActive(clientId);
    const slot = await this.slotsService.getOpenSlot();

    const existing = await this.prisma.order.findFirst({
      where: { clientId, slotId: slot.id, consumedAt: null },
      orderBy: { createdAt: 'asc' },
      include: { client: true },
    });

    if (existing) {
      const base = process.env.FRONTEND_BASE_URL ?? 'http://localhost:3001';
      return {
        orderId: existing.id,
        clientId: existing.clientId,
        clientName: existing.client.name,
        token: existing.token,
        url: `${base.replace(/\/$/, '')}/order/${existing.token}`,
        slotSeq: slot.seq,
        reused: true,
      };
    }

    return { ...(await this.createLink(clientId)), reused: false };
  }
}
