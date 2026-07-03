import { BadRequestException, Injectable } from '@nestjs/common';
import type { CreateLinkResponse } from '@pannico/shared';
import { PrismaService } from '../prisma/prisma.service';
import { SlotsService } from '../slots/slots.service';
import { normalizePhoneE164 } from '../common/phone.util';
import { generateToken } from '../common/token.util';
import { computeExpiry } from '../config/token.config';

@Injectable()
export class LinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly slotsService: SlotsService,
  ) {}

  /**
   * Normalizes the phone (rejecting missing/malformed), then creates a unique
   * token + a `pending` order bound to that phone, and returns the shareable URL.
   */
  async createLink(rawPhone: string): Promise<CreateLinkResponse> {
    const phone = normalizePhoneE164(rawPhone);
    if (!phone) {
      throw new BadRequestException(
        'A valid phone number (E.164, e.g. +5491122334455) is required.',
      );
    }

    const expiresAt = computeExpiry();
    const slotId = await this.slotsService.getOpenSlotId();
    const order = await this.prisma.order.create({
      data: {
        phone,
        token: generateToken(),
        status: 'pending',
        slotId,
        expiresAt,
      },
    });

    const base = process.env.FRONTEND_BASE_URL ?? 'http://localhost:3001';
    return {
      orderId: order.id,
      phone: order.phone,
      token: order.token,
      url: `${base.replace(/\/$/, '')}/order/${order.token}`,
      expiresAt: order.expiresAt.toISOString(),
    };
  }
}
