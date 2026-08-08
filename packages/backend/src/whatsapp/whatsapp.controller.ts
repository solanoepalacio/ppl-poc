import {
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Logger,
  NotFoundException,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { WhatsappConfigService } from './whatsapp.config';
import { WhatsappService } from './whatsapp.service';

/** Express with the raw body kept (see `rawBody: true` in main.ts). */
type RawRequest = Request & { rawBody?: Buffer };

@Controller('whatsapp')
export class WhatsappController {
  private readonly logger = new Logger('WhatsappWebhook');

  constructor(
    private readonly config: WhatsappConfigService,
    private readonly whatsapp: WhatsappService,
  ) {}

  /**
   * Meta's registration handshake: echo the challenge, but only for the right
   * verify token — echoing is what proves we own the endpoint.
   *
   * 404 when the agent is not configured, so an unconfigured deployment looks
   * like no endpoint at all rather than a broken one.
   */
  @Get('webhook')
  verify(
    @Query('hub.mode') mode?: string,
    @Query('hub.verify_token') token?: string,
    @Query('hub.challenge') challenge?: string,
  ): string {
    if (!this.config.enabled) throw new NotFoundException();
    const echo = this.whatsapp.verifyChallenge(mode, token, challenge);
    if (echo === null) {
      this.logger.warn('Verification rejected: wrong mode or verify token.');
      throw new ForbiddenException();
    }
    return echo;
  }

  /**
   * Inbound deliveries.
   *
   * Answers 200 for everything it accepts — ignored payloads and failures
   * alike. Meta retries a delivery until it is acknowledged, for up to seven
   * days, so returning an error over a message we could not act on buys a week
   * of the same message arriving again. The one thing that does *not* get a 200
   * is a bad signature: that is not a delivery we failed to process, it is a
   * request we have no reason to believe came from Meta.
   */
  @Post('webhook')
  @HttpCode(200)
  async receive(
    @Req() req: RawRequest,
    @Headers('x-hub-signature-256') signature?: string,
  ): Promise<string> {
    if (!this.config.enabled) throw new NotFoundException();

    const raw = req.rawBody;
    if (!raw) {
      // Without the raw bytes the signature cannot be checked honestly, and
      // checking it against a re-serialisation would be theatre.
      this.logger.error('Raw body unavailable; refusing to process.');
      throw new ForbiddenException();
    }
    if (!this.whatsapp.verifySignature(raw, signature)) {
      this.logger.warn('Delivery rejected: bad or missing signature.');
      throw new ForbiddenException();
    }

    const messages = this.whatsapp.extractMessages(req.body);
    for (const message of messages) {
      try {
        const outcome = await this.whatsapp.handleMessage(message);
        this.logger.log(`${message.wamid}: ${describe(outcome)}`);
      } catch (e) {
        // Swallowed on purpose: see the 200 above.
        this.logger.error(
          `${message.wamid}: failed — ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
    return 'EVENT_RECEIVED';
  }
}

const describe = (o: Awaited<ReturnType<WhatsappService['handleMessage']>>) => {
  switch (o.kind) {
    case 'ignored':
      return `ignorado (${o.reason})`;
    case 'suppressed':
      return 'suprimido (respuesta reciente al mismo remitente)';
    case 'unknown-sender':
      return 'remitente desconocido, respuesta de cortesía';
    case 'replied':
      return `link enviado a ${o.clientName}${o.reused ? ' (reusado)' : ' (nuevo)'}`;
  }
};
