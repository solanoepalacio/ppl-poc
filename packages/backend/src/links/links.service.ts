import { Injectable } from '@nestjs/common';
import type { CreateLinkResponse } from '@pannico/shared';
import type { Slot } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SlotsService } from '../slots/slots.service';
import { ClientsService } from '../clients/clients.service';
import { generateToken } from '../common/token.util';

/** An order joined with the client it is for, as loaded for a link response. */
type OrderWithClient = {
  id: string;
  clientId: string;
  token: string;
  client: { name: string };
};

@Injectable()
export class LinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly slotsService: SlotsService,
    private readonly clientsService: ClientsService,
  ) {}

  /**
   * Validates the client (rejecting missing/inactive), then returns the client's
   * shareable URL for the open bloque — the one it already has when there is
   * one, a newly created token + order when there is not.
   *
   * Generating twice for the same client returns the same link rather than a
   * second one. Issuing a fresh token each time would invalidate nothing but
   * leave every superseded order behind: an order row is created up front, and
   * the bloque view lists every order it holds regardless of whether it was ever
   * filled in, so each surplus link shows up as an empty row the manager cannot
   * account for. A caller that repeats the request — an agent answering a
   * customer who writes twice — would leak one per message.
   *
   * Reuse is scoped by `slotId` to the open bloque, which is also what makes it
   * correct: those two clauses together are exactly the token-validity predicate
   * (unconsumed, in an open bloque) that TokenService.isValid states, so a link
   * is reused only while it is still usable. Closing a bloque therefore re-arms
   * generation with no code of its own, and a consumed link is never handed out
   * a second time.
   *
   * `source` is the third clause and the load-bearing one: a manually
   * transcribed order also has an unused token and a null `consumedAt`, and
   * handing one to a customer would append their items to the manager's and
   * double that product's production totals.
   */
  async createLink(clientId: string): Promise<CreateLinkResponse> {
    await this.clientsService.assertActive(clientId);

    const slot = await this.slotsService.getOpenSlot();

    const existing = await this.prisma.order.findFirst({
      where: {
        clientId,
        slotId: slot.id,
        source: 'link',
        consumedAt: null,
      },
      // Newest first so that a directory left holding more than one live link
      // for a client — rows predating this behaviour — settles on the most
      // recently shared one rather than resurrecting the oldest.
      orderBy: { createdAt: 'desc' },
      include: { client: true },
    });
    if (existing) {
      return this.toResponse(existing, slot, true);
    }

    const order = await this.prisma.order.create({
      data: {
        clientId,
        token: generateToken(),
        slotId: slot.id,
        source: 'link',
      },
      include: { client: true },
    });
    return this.toResponse(order, slot, false);
  }

  /**
   * Builds the response both branches return, so a reused link and a fresh one
   * cannot describe themselves differently.
   */
  private toResponse(
    order: OrderWithClient,
    slot: Slot,
    reused: boolean,
  ): CreateLinkResponse {
    const base = process.env.FRONTEND_BASE_URL ?? 'http://localhost:3001';
    return {
      orderId: order.id,
      clientId: order.clientId,
      clientName: order.client.name,
      token: order.token,
      url: `${base.replace(/\/$/, '')}/order/${order.token}`,
      slotSeq: slot.seq,
      reused,
    };
  }
}
